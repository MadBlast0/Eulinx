---
title: DynamicGraphs Specification - Part 02
status: draft
version: 1.0
tags:
  - workflow-engine
  - dynamic-graphs
  - validation
related:
  - "[[DynamicGraphs-Part01]]"
  - "[[DynamicGraphs-Part03]]"
  - "[[NodeArchitecture-Part01]]"
  - "[[EdgeTypes-Part01]]"
---

# DynamicGraphs Specification (Part 02)

# Scope of This Part

Part 01 established that a mutation is a proposal. This part defines the proposal's exact shape and every rule that decides whether it is well-formed.

Validation here is **structural and referential only**. It answers "is this request coherent against the current graph?" It does not answer "is the proposer allowed?" (Part 03), "does this create a cycle?" (Part 04), or "is there budget?" (Part 05). Those are separate gates, run in that order, and each has its own error kind.

The separation matters. A single `invalid_mutation` error tells an Orchestrator nothing it can act on. Sixteen specific kinds let it replan.

# What a Mutation Is

A mutation is a **set of operations applied as one unit** to a running graph.

```text
One GraphMutationRequest
  = one atomic change to the graph
  = 1..N operations
  = all applied, or none applied
```

An Orchestrator that wants to add three Builder nodes and wire them to a join node submits **one** request with five operations, not five requests. This is not a style preference. Five separate requests produce four intermediate graph states in which the mutation is half-applied: nodes exist with no inbound edges, and the engine, which is walking the graph concurrently, may observe them. One request produces exactly two observable states, before and after.

```text
WRONG                              RIGHT
add_node B1   -> graph v5          add_node B1
add_node B2   -> graph v6          add_node B2
add_node B3   -> graph v7          add_node B3
add_edge P>B1 -> graph v8          add_edge P>B1
add_edge P>B2 -> graph v9          add_edge P>B2
                                   add_edge P>B3
5 requests, 5 versions,            add_edge B1>J
4 of them incoherent               add_edge B2>J
                                   add_edge B3>J
                                   -> 1 request, 1 version, always coherent
```

# The Five Operations

Only these five operations exist. There is no `delete_node`, no `update_node`, no `rewrite_edge`, and no `set_node_state`. Their absence is the "additive, never destructive" philosophy expressed as a type.

## add_node

```ts
{ op: "add_node"; node: WorkflowNodeSpec }
```

Adds one node in state `pending`. The node does not run until an inbound edge is traversed. A node added without any inbound edge in the same request is rejected with `unreachable_node_added` (Part 04).

## add_edge

```ts
{ op: "add_edge"; edge: WorkflowEdgeSpec }
```

Adds one edge. Both endpoints MUST exist, either already in the graph or added by an earlier operation in the same request. The target node MUST be in state `pending`; an edge into a `running`, `completed`, or `failed` node is rejected with `immutable_node_touched`.

## expand_subgraph

```ts
{ op: "expand_subgraph"; placeholderNodeId: string; subgraph: SubgraphSpec }
```

The signature pattern. A placeholder node is replaced in-place by a generated subgraph. Fully specified in Part 04.

## retarget_pending_edge

```ts
{ op: "retarget_pending_edge"; edgeId: string; newTargetNodeId: string }
```

The one operation that is not purely additive, and it is tightly constrained. It may only retarget an edge that has **never been traversed**, and only when the source node is not `running`. This exists so an expansion can splice a subgraph between two already-wired nodes without deleting the original edge. An attempt to retarget a traversed edge is `immutable_history_touched`.

## cancel_pending_node

```ts
{ op: "cancel_pending_node"; nodeId: string; cancelReason: string }
```

Marks a `pending` node as `cancelled`. This is **not deletion**. The node stays in the graph, in the database, and in the UI, with state `cancelled` and a recorded reason. Its record is history and history is preserved. A node in any state other than `pending` cannot be cancelled by a mutation; a running node is stopped through [[ExecutionFlow-Part01]], not by rewriting the graph.

# Field Semantics

Every field of `GraphMutationRequest`, with its meaning and its validation rule.

| Field | Meaning | Rule |
| --- | --- | --- |
| `mutationId` | UUIDv4, unique across all runs | MUST be a valid UUIDv4. MUST NOT already exist in `graph_mutations`. Duplicate is idempotent: return the original result. |
| `runId` | The in-flight execution being mutated | MUST reference a run in state `running`. A run in `completed`, `failed`, or `cancelled` rejects with `schema_invalid`. |
| `workflowId` | The workflow definition | MUST match the run's `workflowId`. |
| `proposedBy` | Who is asking | Validated in Part 03. Structurally MUST have a non-empty `id` and `nodeId`. |
| `proposedAtNodeId` | The node from which the proposal originated | MUST exist. MUST be in state `running`. MUST equal `proposedBy.nodeId`. |
| `operations` | The unit of change | MUST have length >= 1 and <= 200. Empty is `schema_invalid`. Over 200 is `schema_invalid`; an Orchestrator proposing 200+ operations at once is not planning, it is thrashing. |
| `reason` | Human and audit readable justification | MUST be non-empty, <= 2000 chars. Recorded in the event. Never parsed. |
| `mode` | `normal`, `dry_run`, or `replay` | `replay` MUST only be set by the ReplayEngine. An Orchestrator setting `mode: "replay"` is rejected with `unauthorized_actor`. |
| `expectedGraphVersion` | Optimistic concurrency token | MUST equal the graph's current version. Mismatch is `graph_version_stale`. |
| `proposedAt` | ISO 8601 UTC timestamp | MUST parse. MUST NOT be more than 60s in the future. |

## The graphVersion Token

Every graph carries a `graphVersion: number`, starting at 1 and incremented by exactly 1 on every applied mutation.

An Orchestrator reads the graph, reasons for some seconds, and proposes. In that window another Orchestrator may have mutated. `expectedGraphVersion` is how the mutator detects that.

```ts
type WorkflowGraphState = {
  runId: string;
  workflowId: string;
  graphVersion: number;
  nodes: Map<string, WorkflowNodeRecord>;
  edges: Map<string, WorkflowEdgeRecord>;
  entryNodeId: string;
  lastMutationSeq: number;
};
```

The check is exact equality, not `>=`.

```text
graph.graphVersion == request.expectedGraphVersion   -> proceed
graph.graphVersion != request.expectedGraphVersion   -> graph_version_stale, retryable: true
```

`graph_version_stale` is the only error with `retryable: true` by default. The Orchestrator re-reads the graph, re-reasons against the new shape, and proposes again. It MUST NOT blindly resubmit the same operations with a bumped version, because the reason the version changed may be exactly the reason its plan is now wrong. Part 05's algorithm makes the mutator take a write lock via the LockManager for the duration, so the retry window is small and bounded.

# Node Spec Validation

```ts
type WorkflowNodeSpec = {
  nodeId: string;
  nodeType: string;
  label: string;
  config: Record<string, unknown>;
  roleId?: string;
  expansionDepth: number;
  createdByMutationId: string;
  createdByNodeId: string;
};
```

Rules, in evaluation order:

1. `nodeId` MUST be a valid UUIDv4. Otherwise `schema_invalid`.
2. `nodeId` MUST NOT already exist in the graph. Otherwise `duplicate_node_id`.
3. `nodeId` MUST NOT be repeated within the same request's operations. Otherwise `duplicate_node_id`.
4. `nodeType` MUST be a registered type per [[NodeTypes-Part01]]. Otherwise `schema_invalid` with message naming the unknown type.
5. `nodeType` MUST NOT be `"entry"`. A run has exactly one entry node and it is authored, never added. Otherwise `schema_invalid`.
6. `label` MUST be non-empty and <= 200 chars. Otherwise `schema_invalid`.
7. `config` MUST validate against the JSON Schema registered for `nodeType`. Otherwise `schema_invalid` with the failing JSON pointer in `message`.
8. `roleId` MUST be present if and only if `nodeType` is one that spawns a Worker (`builder`, `verifier`, `orchestrator`). Otherwise `schema_invalid`.
9. `roleId`, when present, MUST resolve to a role whose permissions are a subset of the proposing Orchestrator's permissions. Otherwise `unauthorized_actor` (Part 03). A planner cannot create a node more powerful than itself.
10. `expansionDepth` MUST equal `proposingNode.expansionDepth + 1`. Otherwise `schema_invalid`. The mutator does not trust this field; it recomputes it and rejects a mismatch rather than silently correcting, because a mismatch means the Orchestrator's model of the graph is wrong.
11. `createdByMutationId` MUST equal the request's `mutationId`. Otherwise `schema_invalid`.
12. `createdByNodeId` MUST equal `proposedAtNodeId`. Otherwise `schema_invalid`.

Rule 9 is worth restating because it is a security boundary, not a formality. It is the workflow-engine expression of cardinal rule nine: a child MUST NOT exceed its parent's permissions. An Orchestrator running with a read-only role cannot add a Builder node with a write role. See [[WorkerPermissions-Part01]].

# Edge Spec Validation

```ts
type WorkflowEdgeSpec = {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: "sequence" | "conditional" | "parallel_fan_out" | "parallel_join" | "loop_back" | "error";
  condition?: string;
  createdByMutationId: string;
};
```

Rules, in evaluation order:

1. `edgeId` MUST be a valid UUIDv4, not already present, not repeated in the request. Otherwise `duplicate_edge_id`.
2. `fromNodeId` MUST resolve, either in the existing graph or from an `add_node` earlier in this request. Otherwise `unknown_node_reference`.
3. `toNodeId` MUST resolve the same way. Otherwise `unknown_node_reference`.
4. `fromNodeId` MUST NOT equal `toNodeId`. A self-edge is a one-node cycle. Otherwise `cycle_introduced` with `cyclePath: [nodeId, nodeId]`.
5. `toNodeId` MUST reference a node in state `pending`. Otherwise `immutable_node_touched`.
6. `edgeType` MUST be one of the six literals. Otherwise `schema_invalid`.
7. `condition` MUST be present if and only if `edgeType` is `conditional`. Otherwise `schema_invalid`.
8. `condition`, when present, MUST parse as a valid ConditionExpression per [[ConditionNodes-Part01]]. It MUST NOT be evaluated during validation. Otherwise `schema_invalid`.
9. `edgeType == "loop_back"` MUST only be added when `fromNodeId` resolves to a node whose type is `loop`. Otherwise `cycle_introduced`. This is the sole legal cycle and only a LoopNode may declare it. See [[LoopNodes-Part01]].
10. `edgeType == "parallel_join"` MUST target a node of type `join`. Otherwise `schema_invalid`.
11. `createdByMutationId` MUST equal the request's `mutationId`. Otherwise `schema_invalid`.

Rule 8 deserves a note. The condition is an AI-authored string. It is validated for syntax and stored; it is never `eval`'d, never interpolated into SQL, and never executed at validation time. It is evaluated later by the deterministic condition evaluator in a sandbox with a fixed variable set. An AI-authored string that reaches an interpreter is the same failure as an AI-authored string that reaches a shell.

# What a Mutation May Never Touch

This table is the enforcement of the "past is immutable" philosophy. Every row is checked before the transaction opens.

| Target | Rule | Error on violation |
| --- | --- | --- |
| A node in state `running` | MUST NOT be modified, cancelled, retargeted into, or deleted | `immutable_node_touched` |
| A node in state `completed` | MUST NOT be modified, cancelled, or deleted | `immutable_node_touched` |
| A node in state `failed` | MUST NOT be modified, cancelled, or deleted | `immutable_node_touched` |
| A node in state `cancelled` | MUST NOT be re-cancelled or edged into | `immutable_node_touched` |
| The entry node | MUST NOT be cancelled, retargeted, or duplicated | `immutable_node_touched` |
| An edge with `traversedAt != null` | MUST NOT be retargeted or removed | `immutable_history_touched` |
| Any `workflow_node_history` row | MUST NOT be updated or deleted, ever | `immutable_history_touched` |
| Any emitted EventBus event | MUST NOT be retracted or edited | `immutable_history_touched` |
| Any node's `expansionDepth` after creation | MUST NOT change | `immutable_node_touched` |
| Any node's `createdByMutationId` | MUST NOT change | `immutable_node_touched` |
| A completed node's produced Artifact | MUST NOT be detached from the node | `immutable_history_touched` |

## The Running Node's Own Definition

The sharpest case, and the one implementers get wrong.

An Orchestrator node is `running`. It is the thing proposing the mutation. Its `config` is right there in memory. Can it change its own config?

**No.** `immutable_node_touched`.

```text
An Orchestrator may extend the graph AROUND itself.
An Orchestrator MUST NOT rewrite ITSELF.
```

The reason is that the node's definition is the record of what the engine was told to run. The engine dispatched this node with this config. If the config changes mid-run, the execution record no longer describes the execution, and the Replay that reads that record reconstructs a run that never happened. A running node's definition is frozen for exactly as long as it is running, for the same reason a Worker's resolved profile is frozen for exactly as long as the Worker lives. See [[WorkerCreation-Part01]].

An Orchestrator that has learned something and wants different behavior does not edit itself. It adds a new node with the new config and wires to it. That is what "the graph grows" means.

# Validation Result

Validation is a pure function. It reads the graph and the request and returns a verdict. It writes nothing, allocates nothing, and emits nothing.

```ts
type ValidationVerdict =
  | { valid: true; resolvedNodes: Map<string, WorkflowNodeSpec>; resolvedEdges: Map<string, WorkflowEdgeSpec> }
  | { valid: false; error: GraphMutationError };

function validateMutation(
  graph: WorkflowGraphState,
  request: GraphMutationRequest
): ValidationVerdict;
```

`resolvedNodes` and `resolvedEdges` are the request's specs merged with the existing graph into a single lookup, so that Part 04's cycle check operates on the **prospective** graph rather than the current one. This is essential: a cycle formed by two edges added in the same request is invisible if you check each edge against the pre-mutation graph. The check must see the graph as it would be.

Because validation is pure, `mode: "dry_run"` is implemented by running steps 1 through 12 of Part 05's algorithm and returning before the transaction opens. There is no separate dry-run code path. A separate code path would drift from the real one and eventually approve something the real path rejects.

# Related Documents

- [[DynamicGraphs-Part01]]
- [[DynamicGraphs-Part03]]
- [[DynamicGraphs-Part04]]
- [[DynamicGraphs-Part05]]
- [[DynamicGraphs-Diagrams]]
- [[NodeArchitecture-Part01]]
- [[NodeTypes-Part01]]
- [[EdgeTypes-Part01]]
- [[ConditionNodes-Part01]]
- [[LoopNodes-Part01]]
- [[WorkerPermissions-Part01]]
- [[LockManager-Part01]]
</content>
