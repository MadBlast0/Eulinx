---
title: ExecutionFlow Specification - Part 03
status: draft
version: 1.0
tags:
  - workflow-engine
  - execution-flow
  - scheduling
related:
  - "[[ExecutionFlow-Part02]]"
  - "[[ExecutionFlow-Part04]]"
  - "[[Scheduler-Part01]]"
  - "[[EdgeTypes-Part01]]"
---

# ExecutionFlow Specification (Part 03)

The Tick Loop and the Ready-Set Algorithm.

# What a Tick Is

A tick is one complete pass of the ready-set computation over the run's state. It reads persisted state, produces a set of nodes to dispatch, dispatches them, and ends. It does not wait for anything.

```text
A tick is a pure function:  (RunState at tickSeq N) -> (ReadySet, next RunState)
A tick never blocks.
A tick never runs a node.
A tick never asks a model anything.
```

`tickSeq` increments by exactly 1 per tick. It never repeats within a run. It is the ordering key that makes [[Replay-Part01]] able to reconstruct the exact sequence of decisions.

# What Schedules a Tick

Ticks are event-driven, never polled on a timer. Polling a workflow graph on an interval burns CPU on idle runs and adds latency to fast ones.

A tick MUST be scheduled when any of the following occurs:

```text
run.started                  the initial tick
node.landed                  a NodeRun reached any terminal NodeRunState
edge.evaluated               an EdgeState left pending
graph.mutated                DynamicGraphs added or removed nodes or edges
run.resumed                  a paused run was resumed
timer.fired                  a delay node's wait elapsed
external.signal              a wait-for-event node's event arrived
cancel.requested             a cancel needs to sweep in-flight nodes
```

Tick coalescing: if a tick is already scheduled and not yet started, additional schedule requests MUST NOT queue a second tick. Set a dirty flag instead. When four nodes land in the same event-loop turn, exactly one tick runs and sees all four. Implementations that queue four ticks are correct but wasteful, and they make `tickSeq` inflate meaninglessly in the Replay log.

Re-entrancy: a tick MUST NOT run while another tick for the same `runId` is running. Guard with a per-run mutex. If a tick is requested during a tick, set the dirty flag and let the running tick loop once more when it finishes.

# The Node Readiness Contract

A node is ready when, and only when, all of these hold:

```text
R1. Its NodeRun state is `pending`.
R2. Every incoming EdgeState has left `pending` (all edges are resolved).
R3. Its join condition is satisfied by the resolved edge statuses.
R4. Its own gate predicate, if any, evaluates true against the run context.
R5. The run is in state `running`.
R6. Adding it would not exceed budget.maxNodeRuns.
```

R2 is the one implementers get wrong. "All edges resolved" is not "all edges satisfied". An edge that is `not_taken` or `skipped` is resolved. It has an answer. The join in R3 decides whether that answer is good enough. A node with two incoming edges where one is `satisfied` and one is `not_taken` HAS resolved edges, and an `any` join will fire it while an `all` join will not.

A node with zero incoming edges (an entry node) trivially satisfies R2 and R3.

# The NotReadyReason

Every node that fails a readiness check records why. The UI shows this. Without it, a stuck workflow is an unexplainable black box, and users file bugs the developer cannot reproduce.

```ts
type NotReadyReason =
  | { kind: "waiting_on_edges"; pendingEdgeIds: string[]; pendingFromNodeIds: string[] }
  | { kind: "join_unsatisfied"; joinKind: JoinKind; satisfiedCount: number; requiredCount: number }
  | { kind: "gate_false"; predicateRef: string; evaluatedValue: JsonValue }
  | { kind: "run_not_running"; runState: RunState }
  | { kind: "node_budget_exhausted"; nodeRunsUsed: number; nodeRunsMax: number }
  | { kind: "already_landed"; nodeRunState: NodeRunState };
```

`notReadyReason` is written on the `NodeRun` row on every tick that evaluates it and finds it not ready. It is cleared when the node becomes ready.

# The Ready-Set Algorithm

This is the core of the whole document. Transcribe it exactly.

```ts
function computeReadySet(runId: string, tickSeq: number): ReadySet;

type ReadySet = {
  runId: string;
  tickSeq: number;
  nodes: ReadyNode[];
  computedAt: string;
};

type ReadyNode = {
  nodeRunId: string;
  nodeId: string;
  branchId: string;
  scopeId: string;
  joinInputs: JoinInput[];
  readyAt: string;
};

type JoinInput = {
  edgeId: string;
  fromNodeId: string;
  status: EdgeStatus;
  carriedValueRef?: string;
};
```

Steps:

1. **Open a read transaction** on the run. Every read in this algorithm sees one consistent snapshot. Reading node state and edge state in separate transactions is a race: a node lands between the two reads and the tick computes readiness from a half-updated graph.

2. **Load the run row.** If `run.state` is not `running`, return an empty `ReadySet` and record `NotReadyReason.kind = "run_not_running"` on nothing (there is nothing to record it on; just stop). Ticks on a `paused`, `cancelling`, or terminal run produce no dispatches.

3. **Load all `NodeRun` rows for the run** into a `HashMap<NodeId, NodeRun>`.

4. **Load all `EdgeState` rows for the run** into a `HashMap<NodeId, Vec<EdgeState>>` keyed by `toNodeId`. This is the incoming-edge index. Build it once per tick, not once per node.

5. **Initialize** `ready: Vec<ReadyNode> = []`.

6. **Iterate every `NodeRun` in ascending `nodeId` lexical order.** The order MUST be deterministic. Iterating a hash map in native order produces a different dispatch order per process and destroys Replay. Sort.

7. For the current node, **check R1**. If `nodeRun.state != "pending"`, record `NotReadyReason.kind = "already_landed"` and continue to the next node. Do not re-evaluate landed nodes.

8. **Look up incoming edges** for this `nodeId` from the index built at step 4. Call this `incoming`.

9. **Check R2.** Collect `pending = incoming.filter(e => e.status == "pending")`. If `pending` is non-empty, write `NotReadyReason = { kind: "waiting_on_edges", pendingEdgeIds: pending.map(e => e.edgeId), pendingFromNodeIds: pending.map(e => e.fromNodeId) }` and continue to the next node.

10. **Check R3, the join condition.** If `incoming` is empty, the join is trivially satisfied (entry node); go to step 11. Otherwise evaluate the node's join config per the exact table in Part 04's join semantics section, using only the statuses in `incoming`. If unsatisfied, write `NotReadyReason = { kind: "join_unsatisfied", joinKind, satisfiedCount, requiredCount }` and continue.

11. **Determine the skip disposition.** If the join is satisfied but every satisfying edge carries `skipped`, this node is skip-propagated rather than ready. Do NOT add it to the ready set. Instead mark it for skip in the collection `toSkip` and continue. The exact rule, including when a join un-skips, is in Part 05. The tick applies skips after the ready-set is computed, at step 17.

12. **Check R4, the gate predicate.** If the node declares `gate`, evaluate the predicate against the run context at this node's `scopeId`. The predicate language is the pure expression subset defined in [[ConditionNodes-Part01]]; it MUST be side-effect free and MUST NOT call a model. If it evaluates false, write `NotReadyReason = { kind: "gate_false", predicateRef, evaluatedValue }` and mark the node for skip with `SkipReason.kind = "gate_false"`. If the predicate throws, treat it as a node failure of kind `gate_evaluation_error`, not as false. A broken predicate is a bug, not a decision.

13. **Check R6, the node budget.** If `run.budgetSpent.nodeRuns + ready.length >= run.budget.maxNodeRuns`, write `NotReadyReason = { kind: "node_budget_exhausted", ... }` and continue. Do not add more. The run will terminate as `budget_exhausted` at step 19 if this leaves nothing in flight.

14. **The node is ready.** Build a `ReadyNode`. Its `joinInputs` is the full `incoming` list with statuses and `carriedValueRef`s, because the node's adapter needs to know which branch fed it what. Push to `ready`. Clear `notReadyReason`.

15. **After the loop, sort `ready`** by `(node.priority DESC, nodeId ASC)`. Priority is a static property of the node definition. The secondary key MUST be `nodeId` so ties break deterministically.

16. **Close the read transaction.**

17. **Open a write transaction.** Apply every skip in `toSkip` per Part 05's skip algorithm. This cascades: skipping a node resolves its outgoing edges as `skipped`, which may make downstream nodes evaluable on this same tick. Loop steps 6 through 17 until `toSkip` is empty. Skips are free (they run no work), so resolving them within one tick is correct and avoids a tick per graph layer.

18. **For each `ReadyNode`**, transition its `NodeRun` from `pending` to `ready`, set `readyAt`, and emit `workflow.node.ready`. Commit.

19. **Check quiescence.** If `ready` is empty AND zero `NodeRun`s are in flight AND zero `EdgeState`s are pending, hand to the completion detector in Part 05. Otherwise continue.

20. **Dispatch.** Run the dispatch algorithm below for each `ReadyNode` in the sorted order.

21. **Increment `tickSeq`.** Emit `workflow.run.ticked` with `{ tickSeq, readyCount, inFlightCount, skippedThisTick }`. If the dirty flag was set during this tick, loop back to step 1.

# The Dispatch Algorithm

Dispatch is the handoff from the graph world to the runtime world. ExecutionFlow's involvement ends here until a result comes back.

```ts
function dispatch(readyNode: ReadyNode, run: WorkflowRun): DispatchResult;

type DispatchResult =
  | { ok: true; schedulingUnitId: string }
  | { ok: false; error: DispatchError };

type DispatchError =
  | { kind: "scheduler_rejected"; reason: string }
  | { kind: "scheduler_unavailable" }
  | { kind: "node_type_unknown"; nodeType: string }
  | { kind: "context_read_failed"; scopeId: string }
  | { kind: "persistence_failed" };
```

Steps:

1. **Resolve the node type** from the snapshot. Look up its handler in the node registry (see [[NodeTypes-Part01]]). If absent, fail `node_type_unknown` and record a `NodeFailure` of kind `node_type_unknown`. This is a definition bug and is never retryable.

2. **Assemble the node input.** Read every key the node declares in its `inputs` binding from the run context at this node's `scopeId`, following the read-resolution rules in Part 04. If a required key is missing, fail `context_read_failed` and record a `NodeFailure` of kind `missing_required_input`. Do not substitute a default that is not declared.

3. **Build the `SchedulingUnit`.**

```ts
const unit: SchedulingUnit = {
  id: newId(),
  kind: "workflow_node",
  workspaceId: run.workspaceId,
  sessionId: run.sessionId,
  workflowId: run.workflowId,
  nodeId: readyNode.nodeId,
  priority: nodeDef.priority,
  dependencies: [],
  requiredPermissions: nodeDef.requiredPermissions,
  requiredLocks: nodeDef.requiredLocks,
  budgetEstimate: nodeDef.budgetEstimate,
  state: "created",
  createdAt: nowIso(),
};
```

`dependencies` is **empty**. This is deliberate and it is the boundary in Part 01 made concrete. ExecutionFlow has already proven every graph dependency is satisfied; that is what the ready-set computation IS. Handing the Scheduler the graph dependencies again would make it recompute the same thing with less information. The Scheduler's job is machine-level gating: locks, permissions, concurrency, budget.

4. **Persist the linkage.** Write `nodeRun.schedulingUnitId = unit.id`, transition `NodeRun` to `dispatched`, set `dispatchedAt`. If the write fails, fail `persistence_failed`, retryable, and leave the node in `ready` so the next tick retries the dispatch. A node in `ready` with no `schedulingUnitId` is a legal, recoverable state.

5. **Submit to the Scheduler.** Call `scheduler.submit(unit)`. Never call the ExecutionEngine. If the Scheduler is unavailable, fail `scheduler_unavailable`, retryable; roll the `NodeRun` back to `ready` and let the next tick retry.

6. **If the Scheduler rejects the unit** (for example, an unsatisfiable permission), fail `scheduler_rejected` and record a `NodeFailure` of kind `scheduler_rejected` with the Scheduler's reason string verbatim. Apply the node's `failurePolicy` per Part 05.

7. **Emit `workflow.node.dispatched`** with `{ runId, nodeId, nodeRunId, schedulingUnitId, attempt }`.

8. **Return.** The tick does not wait. The node may start in 2ms or in 20 minutes. ExecutionFlow's next involvement is the result callback.

# The Result Callback

The Scheduler grants the unit, the ExecutionEngine runs it, and the result comes back to ExecutionFlow through the event stream, not a blocking call.

```ts
type NodeResult = {
  nodeRunId: string;
  runId: string;
  nodeId: string;
  attempt: number;
  restartGeneration: number;
  outcome: "succeeded" | "failed";
  outputs: Record<string, JsonValue>;
  artifactIds: string[];
  chosenEdgeIds?: string[];
  graphMutations?: GraphMutation[];
  failure?: NodeFailure;
  costUsd: number;
  tokens: number;
  durationMs: number;
  startedAt: string;
  endedAt: string;
};
```

Steps to apply a result:

1. **Generation check.** If `result.restartGeneration != run.restartGeneration`, DISCARD the result and emit `workflow.node.stale_result_discarded`. This is a result from before an app restart. Applying it would resurrect a dead branch and corrupt the run.

2. **Attempt check.** If `result.attempt != nodeRun.attempt`, discard the same way. This is a late result from a superseded retry.

3. **State check.** If `nodeRun.state` is already terminal, discard and emit `workflow.node.duplicate_result_discarded`. Results MUST be idempotent on arrival; the network and the event bus can both deliver twice.

4. **Open a write transaction.** Everything below is atomic. A crash between writing the node result and resolving its edges leaves a landed node whose successors wait forever.

5. **Write the result** onto the `NodeRun`. Set `state` to `succeeded` or `failed`, `endedAt`, `result`.

6. **Add to budget spent.** `run.budgetSpent.costUsd += result.costUsd`, `.tokens += result.tokens`, `.nodeRuns += 1`.

7. **Apply outputs to the run context** per Part 04's write rules. This is the ONLY place the context is written by node output.

8. **Apply graph mutations**, if any, per [[DynamicGraphs-Part01]]. New nodes get `pending` `NodeRun` rows; new edges get `pending` `EdgeState` rows.

9. **Resolve every outgoing edge** of this node per the edge-evaluation algorithm below.

10. **Apply the failure policy** if `outcome` is `failed`, per Part 05.

11. **Commit.** Emit `workflow.node.landed` with the outcome.

12. **Schedule a tick.**

# The Edge Evaluation Algorithm

Every outgoing edge of a landed node is evaluated exactly once. Never twice. An edge that leaves `pending` never returns to it.

For each edge in the node's outgoing edges, sorted by `edgeId` ascending:

1. If the node's outcome is `failed`, set `edge.status = "failed"` and go to step 6.
2. If the node was `skipped`, set `edge.status = "skipped"` and go to step 6.
3. If the node was `cancelled`, set `edge.status = "cancelled"` and go to step 6.
4. If the node declares `chosenEdgeIds` in its result (this is a condition node; see [[ConditionNodes-Part01]]), set `edge.status = "satisfied"` if `edge.edgeId` is in the list, else `"not_taken"`. A condition node that returns an empty `chosenEdgeIds` is legal and means every outgoing edge is `not_taken`, which skips the entire subtree.
5. Otherwise the edge has a condition expression or none. If none, `"satisfied"`. If it has one, evaluate it against the run context; true means `"satisfied"`, false means `"not_taken"`. An expression that throws is a `NodeFailure` of kind `edge_evaluation_error` attributed to the SOURCE node, and every outgoing edge becomes `"failed"`.
6. Set `edge.evaluatedAt`. If the edge declares a `carries` binding, resolve the named output value, write it to the context per Part 04, and set `carriedValueRef`.
7. Emit `workflow.edge.evaluated` with `{ edgeId, from, to, status }`.

# Related Documents

- [[ExecutionFlow-Part02]]
- [[ExecutionFlow-Part04]]
- [[ExecutionFlow-Part05]]
- [[ExecutionFlow-Diagrams]]
- [[Scheduler-Part01]]
- [[ExecutionEngine-Part01]]
- [[EdgeTypes-Part01]]
- [[NodeTypes-Part01]]
- [[ConditionNodes-Part01]]
- [[DynamicGraphs-Part01]]
- [[Replay-Part01]]
</content>
</invoke>
