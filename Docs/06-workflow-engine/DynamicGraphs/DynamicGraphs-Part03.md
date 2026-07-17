---
title: DynamicGraphs Specification - Part 03
status: draft
version: 1.0
tags:
  - workflow-engine
  - dynamic-graphs
  - authorization
related:
  - "[[DynamicGraphs-Part02]]"
  - "[[DynamicGraphs-Part04]]"
  - "[[PermissionManager-Part01]]"
  - "[[Orchestrator-Part01]]"
---

# DynamicGraphs Specification (Part 03)

# Scope of This Part

Who may change the shape of a running graph.

The answer is short: **Orchestrator nodes only**. The rest of this part is the machinery that makes that answer unforgeable, because the short answer is worthless if the check can be lied to.

# The Rule

```text
An Orchestrator node, currently running, proposing a mutation to the graph
that contains it, within its own subtree, within its budget

  -> MAY mutate.

Everything else

  -> MUST be rejected with unauthorized_actor.
```

"Everything else" includes, explicitly and without exception:

- a Worker of any role, at any depth
- a Verifier node
- a Builder node
- a Condition node
- an MCP node
- a plugin
- a Worker asking its parent Orchestrator to relay the request verbatim
- an Orchestrator that is not currently `running`
- an Orchestrator proposing a mutation to a different run
- an Orchestrator proposing outside its own subtree
- a tool call whose arguments happen to look like a mutation
- the AI text of any node's output, parsed by anything

# Why Only Orchestrators

Eulinx's division of labor is the whole architecture:

```text
Workers reason.
Orchestrators plan.
Workflows map work.
Runtime services make it happen.
```

The graph **is** the plan. Mutating the graph is planning. Therefore only the role whose job is planning may do it. This is not an arbitrary permission assignment; it falls directly out of the noun definitions in [[Orchestrator-Part01]] and [[Worker-Part01]].

The security argument is sharper than the architectural one.

A Worker is an AI process with a scoped role, a sandbox, and a permission profile. Those limits are set at creation and are immutable for the Worker's life ([[WorkerCreation-Part01]]). A Worker cannot widen its own permissions. That is the entire security model.

Now suppose a Worker could add a node to the graph.

```text
Worker W has role "read_only_analyst". It may not write files.

W adds node N with roleId "full_write_builder".
N runs. N spawns a Worker with write permissions.
N writes the files W wanted written.

W has just escalated from read-only to full write
without the PermissionManager ever seeing an escalation request.
```

The permission system was not bypassed. It was **routed around**. Every individual check passed; the composition is a privilege escalation. Graph mutation is a permission-granting operation wearing a data-structure costume, and it must be governed as one.

This is why the check fails closed, why it runs first, and why it is not configurable.

# The Authorization Check

The check runs as step 2 of Part 05's algorithm, immediately after the request deserializes and before any schema validation. It runs before schema validation on purpose: an unauthorized actor MUST NOT learn whether its malformed request would have been structurally valid. Rejection is uniform and uninformative to an unauthorized caller.

```ts
type AuthorizationVerdict =
  | { authorized: true; orchestrator: OrchestratorContext }
  | { authorized: false; error: GraphMutationError };

type OrchestratorContext = {
  orchestratorId: string;
  nodeId: string;
  runId: string;
  expansionDepth: number;
  subtreeRootNodeId: string;
  resolvedPermissions: PermissionSet;
  budget: OrchestratorBudget;
};

function authorizeMutation(
  graph: WorkflowGraphState,
  request: GraphMutationRequest,
  actorRegistry: ActorRegistry
): AuthorizationVerdict;
```

## The Seven Gates

Every gate MUST pass. The first failure returns immediately.

**Gate 1: The actor is established by the runtime, not by the request.**

This is the gate everything else rests on.

`request.proposedBy` is a field in a JSON object that arrived from a node. It is a **claim**. It MUST NOT be trusted.

```text
WRONG:
  if (request.proposedBy.kind === "orchestrator") { proceed }

  A Worker sets proposedBy.kind = "orchestrator" and mutates the graph.
  The check is a comment.
```

The mutator resolves the actor from the **runtime's own dispatch record**, keyed by the execution channel the request arrived on.

```text
RIGHT:
  1. The request arrived on a channel bound to exactly one running node
     at dispatch time. Call that nodeId the CHANNEL OWNER.
  2. Look up the channel owner in the graph. That record is the truth.
  3. If request.proposedBy.nodeId != channelOwner.nodeId
       -> unauthorized_actor. The request lied about its own identity.
  4. From here on, use channelOwner. Never use request.proposedBy again.
```

Step 3 is not redundant with step 4. A mismatch is not a harmless error to be corrected by preferring the truth; it is evidence of an impersonation attempt and it MUST be rejected and logged, not silently fixed. The runtime binds the channel when it dispatches the node ([[ExecutionFlow-Part01]]); nothing running inside the node can rebind it.

**Gate 2: The channel owner's node type is `orchestrator`.**

```text
channelOwner.nodeType == "orchestrator"   -> pass
otherwise                                 -> unauthorized_actor
```

The node type comes from the graph record, which was written at authoring or by a prior validated mutation. It is not in the request.

**Gate 3: The channel owner is in state `running`.**

A `pending` node has not started and has nothing to propose. A `completed` node's proposal is a message from the past arriving after its author is gone; applying it would extend a graph based on a decision whose context no longer exists. A `failed` node's plan is, by definition, produced by something that failed.

```text
channelOwner.state == "running"   -> pass
otherwise                         -> unauthorized_actor
```

**Gate 4: The mutation targets the channel owner's own run.**

```text
request.runId == channelOwner.runId   -> pass
otherwise                             -> unauthorized_actor
```

Cross-run mutation does not exist. There is no legitimate case, and the illegitimate case is one run reshaping another run's plan.

**Gate 5: Every touched node is within the actor's subtree.**

An Orchestrator plans **its own** subtree. It MUST NOT reach sideways into a sibling Orchestrator's region and add nodes there.

```text
for each nodeId referenced by any operation:
  if not isDescendantOf(nodeId, channelOwner.subtreeRootNodeId)
     and nodeId != channelOwner.nodeId
       -> unauthorized_actor, offendingNodeId = nodeId
```

`isDescendantOf` walks `createdByNodeId` parentage, not graph edges. Two sibling subtrees may legitimately share an edge into a common join node; they do not share the right to modify each other. The Root Orchestrator's `subtreeRootNodeId` is the entry node, so it may mutate anywhere, which is correct: it owns the whole plan.

**Gate 6: `mode` is not `replay` unless the actor is the ReplayEngine.**

```text
request.mode == "replay" && channelOwner.kind != "runtime:replay_engine"
  -> unauthorized_actor
```

An Orchestrator that could set `mode: "replay"` could bypass budget accounting, because Part 05 grants replay a budget exemption on the grounds that the budget was already checked during the original run. Only the ReplayEngine, which is deterministic runtime code and not an AI, may set it.

**Gate 7: Every added node's role is a subset of the actor's permissions.**

```text
for each add_node op with a roleId:
  addedPerms = resolveRole(op.node.roleId).permissions
  if not isSubsetOf(addedPerms, channelOwner.resolvedPermissions)
    -> unauthorized_actor, offendingNodeId = op.node.nodeId
```

This is cardinal rule nine at the graph layer. The subset test is delegated to the PermissionManager, which is the single authority and which fails closed: an unresolvable role, an unknown permission, or any error inside the check returns "not a subset", never "probably fine". See [[PermissionManager-Part01]].

Note that this uses `channelOwner.resolvedPermissions`, the frozen snapshot taken when the Orchestrator node was dispatched, not a live role lookup. A user editing the role definition mid-run MUST NOT change what a running Orchestrator may create.

# The Worker Rejection Path

The concrete case the specification is built around, traced end to end.

A Builder Worker, mid-reasoning, decides the task needs three more Builders. It emits what it believes is a mutation request.

```text
Step 1. The Worker emits text or a tool call proposing a mutation.

Step 2. The Worker's node is a builder node. Builder nodes have no
        graph-mutation tool in their ToolRegistry profile. The tool
        does not exist. There is nothing to call.
        See [[ToolRegistry-Part01]].

        For most Workers, this is where it ends. The capability is
        simply absent. Absence of capability is the first defense
        and the strongest one.

Step 3. Suppose a plugin, a bug, or a misconfiguration exposes the
        tool anyway. The request reaches the GraphMutator on the
        Worker's channel.

Step 4. Gate 1: channel owner resolves to the builder node B-7742.
        request.proposedBy.kind claims "orchestrator".
        request.proposedBy.nodeId claims "O-0001".
        B-7742 != O-0001.
        -> REJECT: unauthorized_actor.
           message: "proposedBy.nodeId O-0001 does not match channel
                     owner B-7742. Impersonation attempt."

Step 5. Even had it told the truth, Gate 2 would reject it:
        B-7742.nodeType == "builder", not "orchestrator".
        -> REJECT: unauthorized_actor.

Step 6. Emit workflow.mutation_rejected on the EventBus with
        severity "security". The graph is untouched. graphVersion
        is unchanged. Not one row was written.

Step 7. The Worker receives a typed rejection:
        { ok: false, error: { kind: "unauthorized_actor", ... } }

        It does NOT receive a hint about what would have worked.
        It does NOT receive the graph. It does NOT get to retry.
        retryable: false.

Step 8. The Worker continues its actual task, or completes and
        reports the limitation in its Artifact. If the plan really
        does need three more Builders, the Worker says so in its
        output, its parent Orchestrator reads that output, and
        the ORCHESTRATOR decides whether to propose a mutation.
```

Step 8 is the important one. The Worker's need is not ignored. It is **routed through the planner**, which is exactly the architecture working. The Worker informs. The Orchestrator decides. The runtime validates. Nothing is lost except the Worker's ability to act unilaterally on trusted state, which is the thing that was never supposed to exist.

# Defense In Depth

Four independent layers reject a Worker mutation. Any one of them alone would be sufficient. All four exist because "sufficient" assumes no bugs.

```text
Layer 1  Capability      The mutation tool is not in a Worker's tool profile.
                         ToolRegistry, per-role. The Worker cannot call it.

Layer 2  Channel binding The runtime knows which node is on the wire.
                         The request's own claim about its identity is
                         cross-checked and a mismatch is fatal.

Layer 3  Type gate       channelOwner.nodeType must be "orchestrator",
                         read from the graph record, not the request.

Layer 4  Permission set  Even a real Orchestrator cannot add a node more
                         powerful than itself. PermissionManager, fails closed.
```

An implementer who ships only Layer 1 has a system that is secure until the first plugin. An implementer who ships only Layer 3 has a system that is secure until the first request that lies. Ship all four.

# The Rejection Event

Every rejection emits. This is not optional and it is not debug logging.

```ts
type MutationRejectedEvent = {
  type: "workflow.mutation_rejected";
  runId: string;
  mutationId: string;
  actorNodeId: string;
  actorNodeType: string;
  claimedActorNodeId: string;
  errorKind: GraphMutationErrorKind;
  offendingNodeId?: string;
  offendingEdgeId?: string;
  severity: "info" | "warning" | "security";
  message: string;
  at: string;
};
```

`severity` is assigned deterministically by error kind. There is no judgement call.

| Error kind | Severity |
| --- | --- |
| `unauthorized_actor` | `security` |
| `immutable_node_touched` | `security` |
| `immutable_history_touched` | `security` |
| `replay_divergence` | `security` |
| `cycle_introduced` | `warning` |
| `depth_budget_exhausted` | `warning` |
| `node_budget_exhausted` | `warning` |
| `orchestrator_budget_exhausted` | `warning` |
| `unreachable_node_added` | `warning` |
| `placeholder_not_expandable` | `warning` |
| `subgraph_malformed` | `warning` |
| `persistence_failed` | `warning` |
| `graph_version_stale` | `info` |
| `schema_invalid` | `info` |
| `unknown_node_reference` | `info` |
| `duplicate_node_id` | `info` |
| `duplicate_edge_id` | `info` |

A `security` rejection MUST additionally:

1. Write a row to `security_audit` with the full request body verbatim, unparsed.
2. Surface a persistent notification in the UI. It MUST NOT be auto-dismissed.
3. Increment `run.securityRejectionCount`.
4. If `run.securityRejectionCount >= 3`, transition the run to `blocked` and require explicit human release. Three impersonation attempts in one run is not a bug pattern, it is an attack pattern or a catastrophically broken node, and neither should be allowed to continue unattended.

Rule 4 is a fail-closed default. It MUST NOT be disabled by configuration.

# What the Actor Registry Provides

```ts
type ActorRegistry = {
  resolveChannelOwner(channelId: string): ChannelOwner | null;
};

type ChannelOwner = {
  nodeId: string;
  nodeType: string;
  kind: "orchestrator" | "worker" | "runtime:replay_engine" | "runtime:engine";
  runId: string;
  state: "pending" | "running" | "completed" | "failed" | "cancelled";
  expansionDepth: number;
  subtreeRootNodeId: string;
  resolvedPermissions: PermissionSet;
  dispatchedAt: string;
};
```

`resolveChannelOwner` returning `null` MUST be treated as `unauthorized_actor`, never as "unknown, allow". A request on a channel the runtime does not recognize is a request from something the runtime did not dispatch. Fail closed.

# Related Documents

- [[DynamicGraphs-Part01]]
- [[DynamicGraphs-Part02]]
- [[DynamicGraphs-Part04]]
- [[DynamicGraphs-Part05]]
- [[DynamicGraphs-Diagrams]]
- [[Orchestrator-Part01]]
- [[Worker-Part01]]
- [[PermissionManager-Part01]]
- [[ToolRegistry-Part01]]
- [[WorkerPermissions-Part01]]
- [[WorkerCreation-Part01]]
- [[WorkerHierarchy-Part01]]
- [[ExecutionFlow-Part01]]
- [[EventBus-Part01]]
</content>
