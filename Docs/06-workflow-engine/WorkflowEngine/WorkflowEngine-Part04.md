---
title: WorkflowEngine Specification - Part 04
status: draft
version: 1.0
tags:
  - workflow-engine
  - workflow-engine-core
  - parallelism
  - scheduler
related:
  - "[[WorkflowEngine-Part03]]"
  - "[[WorkflowEngine-Part05]]"
  - "[[Scheduler-Part01]]"
  - "[[ExecutionEngine-Part01]]"
---

# WorkflowEngine Specification (Part 04)

Parallel branch execution and the Scheduler handshake. This part defines how many ready nodes actually run, who decides that, and how results come back without corrupting the graph.

# The Division Of Authority

```text
WorkflowEngine  says: "these 7 nodes are ready."
Scheduler       says: "you may start 3 of them, these 3."
ExecutionEngine says: "here is the result of node X."
WorkflowEngine  says: "applied. now these 4 are ready."
```

The WorkflowEngine MUST NOT decide concurrency. It does not know how many CPU cores exist, how many Worker processes are already alive across other runs, what the user's provider rate limit is, or what the workspace's budget remaining is. The [[Scheduler-Part01]] knows all of that, across all runs.

The Scheduler MUST NOT decide readiness. It does not know what a graph is.

This is why the handshake is a batch call and not a per-node call.

# The Admission Handshake

```ts
type AdmissionRequest = {
  runId: WorkflowRunId;
  workspaceId: string;
  projectId: string;
  candidates: AdmissionCandidate[];
  runPriority: "low" | "normal" | "high" | "critical";
};

type AdmissionCandidate = {
  nodeId: NodeId;
  iterationIndex: number;
  kind: NodeKind;
  topoRank: number;
  estimatedCost: EstimatedCost;
  requiredResources: ResourceClaim[];
};

type EstimatedCost = {
  expectedDurationMs: number;
  expectedTokens: number;
  expectedCostUsd: number;
  spawnsWorker: boolean;
  spawnsProcess: boolean;
};

type ResourceClaim = {
  kind: "worker_slot" | "process_slot" | "provider_rate" | "file_lock" | "mcp_session";
  resourceId: string;
  mode: "shared" | "exclusive";
};

type AdmissionResponse = {
  admitted: NodeExecutionKey[];
  deferred: DeferredNode[];
  rejected: RejectedNode[];
};

type DeferredNode = {
  key: NodeExecutionKey;
  reason: "concurrency_limit" | "resource_busy" | "rate_limited" | "budget_pressure";
  retryAfterMs: number;
};

type RejectedNode = {
  key: NodeExecutionKey;
  reason: "budget_exhausted" | "resource_unavailable_permanently" | "workspace_suspended";
  message: string;
};
```

Three outcomes, three different engine behaviours. Collapsing them is a common and expensive mistake:

```text
admitted  -> dispatch now. Transition node ready -> running.
deferred  -> leave the node in "ready". Do nothing else.
             It will be offered again on the next tick. This is NOT an error.
rejected  -> the node can never run. Transition it to failed with the
             rejection reason, and run the failure cascade from Part 03.
```

A `deferred` node MUST NOT be transitioned to `failed`, MUST NOT be transitioned out of `ready`, and MUST NOT be logged as an error. Deferral is the normal steady state of a busy runtime. A workflow with 40 ready nodes and a concurrency limit of 4 will see 36 deferrals per tick, forever, until the queue drains. Logging that at error level makes the log useless.

`retryAfterMs` is advisory. The engine's tick loop is driven by result arrivals and a timer (Part 08); it MUST NOT sleep for `retryAfterMs` and block the loop. It uses the minimum `retryAfterMs` across deferred nodes to set the tick timer's upper bound, so that a run whose nodes are all deferred still wakes up rather than stalling until a result arrives that never will.

That last sentence names a real deadlock. If the engine only ticks when a result arrives, and every ready node is deferred because another run holds the slots, then this run has nothing running, will receive no result, and will never tick again. It sleeps forever while slots free up around it. The timer is what prevents it. See Part 08 step 15.

# Dispatch

For each admitted key, in the sorted order from Part 03:

```text
dispatchNode(key) 

 1. Look up NodeDefinition from mirror.nodes by key.nodeId.
    If absent: fail the run with unknown_node_kind. (The mirror and the
    admission list disagreed, which means the snapshot changed under us.)
 2. Look up the registered handler for definition.kind.
    If absent: fail the run with unknown_node_kind.
 3. Resolve input port values from the RunContext, per Part 05.
    If a required input is absent: fail the node with port_unsatisfied.
    Do not dispatch with a missing required input.
 4. Transition the node ready -> running using the Part 02 write path.
    If the conditional update affects 0 rows (node_changed_concurrently):
      ABORT this dispatch. Do not execute. Another tick won.
      Release any resource claim already taken. Return.
 5. Build the ExecutionRequest (below).
 6. Call ExecutionEngine.execute(request). It returns a handle immediately;
    it does NOT block until completion.
 7. Record the returned executionId on the node's runtime state row.
 8. Add key to mirror.runningSet.
 9. Emit workflow.node.started.
```

Step 4 before step 6 is mandatory and the ordering is the whole point. The node is marked `running` **in SQLite, conditionally, transactionally** before the ExecutionEngine is called. If the app dies between step 4 and step 6, recovery (Part 06) sees a `running` node with no live execution and handles it. If the order were reversed, the app could die between the execute call and the state write, leaving a real running process that no record knows about. That is an escaped process, and it is exactly the failure [[WorkerCreation-Part01]] forbids for the same reason.

Step 4's zero-row abort is the dispatch-once guarantee. It is not defensive programming; it is the mechanism. Two ticks racing on the same ready node both reach step 4, exactly one gets a row, and the loser abandons.

# The Execution Request

```ts
type ExecutionRequest = {
  executionId: string;
  runId: WorkflowRunId;
  nodeId: NodeId;
  iterationIndex: number;
  attempt: number;

  kind: NodeKind;
  config: unknown;
  inputs: Record<string, PortValue>;

  workspaceId: string;
  projectId: string;
  sessionId: string;
  ownerRef: { kind: "workflow_node"; runId: string; nodeId: string };

  timeoutMs: number;
  deterministicSeed: string;
  mode: RunMode;
};
```

Every field is a value. There is no graph reference, no callback, no mirror pointer, no `EventEmitter`. This is the boundary rule from Part 01 made concrete: the request is serializable, therefore the ExecutionEngine cannot observe anything the request does not contain, therefore a recorded result is a complete description of what happened, therefore replay works.

`deterministicSeed` is `hash(run.determinismSeed + nodeId + iterationIndex + attempt)`. A node that needs randomness uses this and nothing else. See Part 07.

`mode` is passed through so the ExecutionEngine can honour `dry_run` (validate, do not act) and `replay` (return the recorded result). The WorkflowEngine's behaviour is **identical** in all three modes. It does not branch on mode. That identity is what makes a replay a real test of the engine.

# Result Arrival

Results arrive asynchronously and out of order. The engine MUST handle each one through a single serialized entry point.

```ts
type NodeResult =
  | { ok: true; executionId: string; outputs: Record<string, PortValue>; metrics: NodeMetrics }
  | { ok: false; executionId: string; failure: NodeFailure; metrics: NodeMetrics };

type NodeMetrics = {
  durationMs: number;
  tokensUsed: number;
  costUsd: number;
  toolCalls: number;
};
```

```text
onResult(result)

 1. Look up the node key by result.executionId.
    If unknown: log warn "result_for_unknown_execution", DISCARD. Do not
    guess which node it belongs to. This happens legitimately after a
    cancel, when a node returns a result the engine already abandoned.
 2. Read the node's runtime state.
    If state != "running": log warn "result_for_non_running_node", DISCARD.
    This happens after a cancel or a timeout already terminated the node.
    Applying a late result to a terminal node would resurrect it.
 3. If result.ok:
      3a. Validate every declared output port is present and type-matches,
          per [[NodeArchitecture-Part02]]. On mismatch, convert to a
          failure with kind output_schema_violation and continue at step 4.
      3b. Write output values to the RunContext (Part 05). Get PortValueRefs.
      3c. Transition running -> succeeded via the Part 02 write path,
          storing the refs in outputs_json, in the SAME transaction as:
      3d. Decrement remainingDeps on every target of every outgoing edge
          whose satisfaction rule fires (Part 03).
      3e. Increment run.completed_node_count.
    All of 3c, 3d, 3e are one transaction. 
 4. If not result.ok:
      4a. Consult the retry policy (Part 05 of NodeArchitecture).
          If a retry is warranted: transition running -> ready,
          increment attempt, and return. The next tick re-dispatches it.
      4b. Else transition running -> failed and run the failure cascade
          from Part 03, in the same transaction.
 5. Remove key from mirror.runningSet.
 6. Emit workflow.node.succeeded or workflow.node.failed.
 7. Signal the tick loop to run again.
```

Steps 1 and 2 both discard. This is correct and it is not laziness. A cancelled node's process may still return a result seconds later; the engine has already moved on and the run may already be terminal. Applying that result would transition a `cancelled` node to `succeeded`, which Part 02 step 4's legality check would reject anyway, but discarding early is cheaper and produces a clearer log line.

# Serialization Of The Engine Loop

The engine MUST process ticks and results one at a time per run. Concurrency lives in the ExecutionEngine, not in the engine loop.

```text
MUST: one logical task per run, owning the mirror.
MUST: results arrive on a channel; the loop consumes them one at a time.
MUST NOT: mutate the mirror from a result callback on another thread.
MUST NOT: hold a lock across an await that calls the ExecutionEngine.
```

In Rust this is a `tokio::sync::mpsc` channel per run, consumed by a single task that owns the `GraphMirror` by value. No `Arc<Mutex<GraphMirror>>`. If the mirror needs a mutex, the design is wrong: two things are trying to own the run.

The consequence is that the engine loop is single-threaded per run and therefore trivially correct with respect to the mirror, while still dispatching N nodes concurrently. The concurrency is in the ExecutionEngine's tasks, which never touch the mirror.

Different runs are different tasks and may proceed fully in parallel. They contend only at the Scheduler and at SQLite, and both handle it: the Scheduler is a global service by design, and SQLite writes are serialized by `BEGIN IMMEDIATE` with the `run_seq` guard catching anything that slips through.

# Parallel Branch Semantics

```text
      +--> B --+
  A --+        +--> D
      +--> C --+
```

With a concurrency limit of 2 or more:

```text
tick 1: ready = [A]           admitted = [A]      running = {A}
        A succeeds. B and C both reach remainingDeps 0.
tick 2: ready = [B, C]        admitted = [B, C]   running = {B, C}
        C succeeds first (it was faster). D.remainingDeps = 1.
tick 3: ready = []            nothing to admit.   running = {B}
        B succeeds. D.remainingDeps = 0.
tick 4: ready = [D]           admitted = [D]      running = {D}
```

Note tick 3: the ready set is empty but the run is not done, because `runningSet` is non-empty. The terminal check MUST test both. A run whose ready set is empty is not finished; a run whose ready set is empty **and** whose running set is empty is finished. Part 08 step 12.

With a concurrency limit of 1, the same graph produces:

```text
tick 2: ready = [B, C]  admitted = [B]  deferred = [C: concurrency_limit]
tick 3: ready = [C]     admitted = [C]
```

The result of the run is identical. Only the wall-clock differs. That property is the definition of a correct parallel engine, and it is directly testable: run every example graph in [[WorkflowExamples-Part01]] at concurrency 1 and at concurrency 8 and assert the final node states and context values are equal.

# Error Cases

`scheduler_unavailable` - the Scheduler does not respond or returns an error. Do not dispatch anything this tick. Do not fail the run on the first occurrence; the Scheduler may be restarting. Retry on the next tick with exponential backoff up to 30s. After 10 consecutive failures, fail the run with kind `scheduler_unavailable`. MUST NOT dispatch without admission "because the Scheduler is down" - that is precisely when the runtime is least able to absorb 40 concurrent Workers.

`execution_engine_unavailable` - the execute call itself errors synchronously. Transition the node back `running -> ready` (a legal transition specifically to support this case) and treat it as deferred. Same backoff and same 10-failure limit, then fail the run with kind `execution_engine_unavailable`.

`result_for_unknown_execution` - discard, log at warn. Not an error.

`result_for_non_running_node` - discard, log at warn. Not an error.

`output_schema_violation` - the handler returned outputs that do not match its declared ports. Convert to a node failure. MUST NOT coerce, truncate, or drop the offending field. A node whose contract is violated has produced garbage, and passing that garbage downstream turns one bug into ten.

`admission_response_mismatch` - the Scheduler admitted a key that was not in the candidate list. Engine or Scheduler bug. Discard the unknown key, log at error, dispatch the rest. Do not fail the run over it.

# Invariants

```text
A node is dispatched only after its ready -> running transition committed.
A deferred node stays in "ready" and is never failed.
A rejected node is failed and cascaded.
The engine never blocks its loop waiting on the ExecutionEngine.
The mirror is owned by exactly one task per run.
A late result for a non-running node is discarded, never applied.
A run is terminal only when readySet and runningSet are both empty.
Run outcome is independent of the concurrency limit.
```

# AI Notes

Do not call `ExecutionEngine.execute` and then mark the node running. The window between those two lines is where escaped processes are born. Mark first. The conditional update is also your dispatch-once lock; reversing the order throws away both guarantees at once.

Do not treat `deferred` as an error. It is the normal state of a busy system. If you fail nodes on deferral, the first workflow with more branches than CPU cores fails on launch.

Do not put the mirror behind `Arc<Mutex<_>>` and let result callbacks mutate it. Use a channel and a single owning task. The mutex version compiles, passes tests, and then deadlocks the first time a result arrives while a tick holds the lock across the Scheduler await.

Do not apply a result whose node is not `running`. Check state, discard otherwise. This costs one lookup and prevents a cancelled run from resurrecting itself node by node as the abandoned processes report in.

Do not skip the tick timer because "results drive the loop". A run where every node is deferred receives no results and never ticks again. It looks like a hang and it is one.

# Related Documents

- [[WorkflowEngine-Part03]]
- [[WorkflowEngine-Part05]]
- [[WorkflowEngine-Part06]]
- [[WorkflowEngine-Part08]]
- [[WorkflowEngine-Diagrams]]
- [[NodeArchitecture-Part02]]
- [[NodeArchitecture-Part05]]
- [[ExecutionFlow-Part01]]
- [[Scheduler-Part01]]
- [[ExecutionEngine-Part01]]
</content>
</invoke>
