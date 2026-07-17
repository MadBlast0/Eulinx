---
title: ExecutionFlow Specification - Part 02
status: draft
version: 1.0
tags:
  - workflow-engine
  - execution-flow
  - initialization
related:
  - "[[ExecutionFlow-Part01]]"
  - "[[ExecutionFlow-Part03]]"
  - "[[WorkflowEngine-Part01]]"
  - "[[DynamicGraphs-Part01]]"
---

# ExecutionFlow Specification (Part 02)

Triggers, Run Initialization, and Context Seeding.

# Purpose of This Part

Part 01 said a trigger creates a `WorkflowRun`. This part defines exactly how, in an order a small model can transcribe, with every failure point named.

Initialization is all-or-nothing, exactly like [[WorkerCreation-Part01]]. A partially initialized run MUST NOT exist. If step 7 fails, steps 1 through 6 are rolled back in reverse order and the run record is written as `aborted` with a `terminalReason`, never left in `initializing`.

# The Trigger Types

There are nine trigger kinds. Each has a distinct source, a distinct payload contract, and distinct idempotency behaviour. Implementers MUST handle all nine. There is no default case.

```ts
type TriggerKind =
  | "user_manual"
  | "orchestrator_plan"
  | "parent_workflow_node"
  | "schedule_cron"
  | "file_watch"
  | "event_subscription"
  | "api_call"
  | "retry_of_run"
  | "replay";
```

## user_manual

Fired when a human presses Run in the UI. `firedBy.kind` is `"user"`. Payload is whatever the workflow's declared input schema requires, collected by a form in the UI.

Idempotency: none. A user pressing Run twice creates two runs. This is intentional; the user meant it.

Permission: the run inherits the user's permission profile as an upper bound. It MUST NOT exceed it.

## orchestrator_plan

Fired when a Root Orchestrator's plan includes a workflow step. `firedBy.kind` is `"orchestrator"`. Payload carries the orchestrator's `planStepId` and the step's declared inputs.

Idempotency: `idempotencyKey` MUST be set to `orchestratorId + ":" + planStepId`. If a run already exists with that key in a non-terminal state, the existing `runId` is returned and no second run is created. This prevents a re-planning orchestrator from double-firing the same step.

## parent_workflow_node

Fired by a `subworkflow` node inside another run. `firedBy.kind` is `"workflow_node"`. `parentRunId` MUST be set. `depth` MUST be exactly parent depth plus 1.

Rule: if `depth` would exceed `budget.maxDepth`, initialization fails with `depth_limit_exceeded` and the parent node receives a `NodeFailure` of kind `subworkflow_depth_exceeded`. A run MUST NOT be created past the depth limit.

Rule: the child run's budget is drawn from the parent's remaining budget, exactly as a child Worker's is. See Part 04's budget accounting.

Idempotency: `idempotencyKey` is `parentRunId + ":" + nodeId + ":" + attempt`.

## schedule_cron

Fired by the scheduler daemon on a cron expression. `firedBy.kind` is `"system"`. Payload contains `{ scheduledFor: string, actualFiredAt: string }`.

Idempotency: `idempotencyKey` is `workflowId + ":" + scheduledFor`. This makes a missed-tick catch-up safe. If the app was closed at 03:00 and starts at 03:05, the daemon may fire the 03:00 slot once and only once.

Rule: if a previous run of the same `workflowId` from a cron trigger is still non-terminal, the new firing is skipped and an event `workflow.run.overlap_skipped` is emitted. Cron runs MUST NOT overlap themselves.

## file_watch

Fired by a filesystem watcher on a path glob inside the project. Payload contains `{ changedPaths: string[], changeKind: "created" | "modified" | "deleted" }`.

Idempotency: none, but debouncing is MANDATORY. Multiple filesystem events within `debounceMs` (default 500) collapse into one trigger firing whose `changedPaths` is the union.

Rule: the watcher MUST NOT fire on paths inside a Worker sandbox root. Worker scratch writes are not project changes. Filter them by [[WorkspaceManager-Part01]] path-boundary check before firing.

## event_subscription

Fired by an EventBus subscription matching a filter. Payload is the matched event envelope.

Rule: a workflow MUST NOT subscribe to events it itself emits without a `loopGuard`. If `workflowId` appears in the incoming event's causation chain, initialization fails with `trigger_cycle_detected`.

## api_call

Fired by a plugin or an external caller through the IPC surface. Payload is the caller's JSON body.

Rule: the payload MUST be validated against the workflow's declared input schema before anything is allocated. This is untrusted input. An invalid payload fails with `payload_schema_invalid` and allocates nothing.

## retry_of_run

Fired by a user or an orchestrator retrying a failed run. Payload is a copy of the original run's trigger payload. `retryOfRunId` points at the original.

Rule: a retry is a NEW run with a NEW `runId`. It MUST NOT resume the old run's state. There is no partial-retry in this design. The original run stays `failed` forever.

Rule: `retryCount` is carried and incremented. If it exceeds the workflow's `maxRetries`, initialization fails with `retry_limit_exceeded`.

## replay

Fired by the Replay subsystem. Payload is the original trigger payload verbatim.

Rule: a replay run MUST have `budget.maxCostUsd` of 0 and every node adapter MUST be in playback mode, returning recorded results rather than calling models. A replay run that spends real money is a bug. See [[Replay-Part01]].

# The Initialization Algorithm

This algorithm is transcribed directly into `initializeRun(trigger: RunTrigger): RunInitResult`.

```ts
type RunInitResult =
  | { ok: true; runId: string; run: WorkflowRun }
  | { ok: true; runId: string; deduplicated: true }
  | { ok: false; error: RunInitError };

type RunInitError = {
  kind: RunInitErrorKind;
  triggerId: string;
  failedAtStep: number;
  rolledBackSteps: number[];
  message: string;
  retryable: boolean;
  at: string;
};

type RunInitErrorKind =
  | "workflow_not_found"
  | "workflow_version_withdrawn"
  | "payload_schema_invalid"
  | "trigger_cycle_detected"
  | "depth_limit_exceeded"
  | "retry_limit_exceeded"
  | "graph_invalid"
  | "graph_has_cycle"
  | "no_entry_node"
  | "unreachable_terminal_node"
  | "budget_unavailable"
  | "permission_denied"
  | "workspace_unavailable"
  | "runtime_not_ready"
  | "context_seed_failed"
  | "persistence_failed";
```

Steps:

1. **Check runtime readiness.** Ask [[RuntimeManager-Part01]] whether recovery has completed. If not, fail with `runtime_not_ready`, retryable true. Allocate nothing. A run MUST NOT be created before recovery completes, for the same reason a Worker MUST NOT be.

2. **Resolve the workflow definition.** Load `workflowId` at the version named by the trigger, or the latest published version if unnamed. If absent, fail `workflow_not_found`. If the version exists but is marked withdrawn, fail `workflow_version_withdrawn`. Both are non-retryable.

3. **Check idempotency.** If `trigger.idempotencyKey` is set, `SELECT runId FROM workflow_runs WHERE idempotencyKey = ? AND state NOT IN (terminal states)`. If a row exists, return `{ ok: true, runId, deduplicated: true }` and stop. Allocate nothing.

4. **Validate the payload.** Validate `trigger.payload` against the workflow's declared input JSON Schema. On mismatch, fail `payload_schema_invalid` with the schema error path in `message`. Non-retryable.

5. **Check the trigger cycle guard.** Walk the trigger's causation chain. If this `workflowId` appears in it and the workflow does not declare `allowSelfTrigger: true`, fail `trigger_cycle_detected`. Non-retryable.

6. **Check depth.** If `trigger.kind` is `parent_workflow_node`, compute `depth = parentRun.depth + 1`. If `depth > budget.maxDepth`, fail `depth_limit_exceeded`. Otherwise `depth = 0` and `rootRunId = runId`.

7. **Build the GraphSnapshot.** Deep-copy every node and edge of the definition into an immutable `GraphSnapshot` row. Assign `graphSnapshotId`. This copy is what the run walks. The definition is never read again for this run.

8. **Validate the snapshot.** Run the static checks in the next section. Any failure aborts with `graph_invalid`, `graph_has_cycle`, `no_entry_node`, or `unreachable_terminal_node`. All non-retryable.

9. **Reserve budget.** Ask the Scheduler's budget ledger to reserve `budget.maxCostUsd` and `budget.maxTokens`. For a child run, this draws from the parent's remaining reservation. If unavailable, fail `budget_unavailable`, retryable true. **Rollback for step 7 and 8: delete the snapshot row.**

10. **Resolve permissions.** Ask [[PermissionManager-Part01]] for the run's effective profile: the intersection of the workflow's declared profile and `firedBy`'s profile. If the intersection is empty or a required capability is denied, fail `permission_denied`, non-retryable. Fail closed: an error from the PermissionManager is a denial, never an allowance. **Rollback: release the budget reservation, delete the snapshot.**

11. **Write the WorkflowRun row.** State `initializing`, `tickSeq = 0`, `restartGeneration = 0`. This is the first durable trace of the run. **Rollback: delete the row, release budget, delete snapshot.**

12. **Create the run context.** Allocate `contextId` and write an empty `RunContext` with the scope tree described below. **Rollback: delete context, delete run row, release budget, delete snapshot.**

13. **Transition to `seeding` and seed.** Run the seeding algorithm below. On any failure, fail `context_seed_failed`, retryable false, and run all rollbacks.

14. **Materialize NodeRun rows.** For every node in the snapshot, insert a `NodeRun` with state `pending`, `attempt = 0`, `branchId` and `scopeId` assigned per Part 04's branch-labelling rules.

15. **Materialize EdgeState rows.** For every edge in the snapshot, insert an `EdgeState` with status `pending`.

16. **Transition to `running`.** Emit `workflow.run.started`. Schedule tick 1.

If step 16's commit fails, fail `persistence_failed`, retryable true, and roll back steps 15 through 7 in reverse order.

`failedAtStep` and `rolledBackSteps` are not debug niceties. They are the audit trail proving no resource leaked.

# Static Snapshot Validation

Step 8 runs these checks in order. Each has a named failure.

1. **Entry node exists.** At least one node has zero incoming edges, or exactly one node is marked `isEntry: true`. Otherwise `no_entry_node`.
2. **No dangling edges.** Every edge's `fromNodeId` and `toNodeId` resolve to a node in the snapshot. Otherwise `graph_invalid`.
3. **No static cycles outside loop nodes.** Run Kahn's algorithm over the subgraph excluding edges marked `isLoopBack: true`. If nodes remain, `graph_has_cycle`. Loop back-edges are legal and are handled by [[LoopNodes-Part01]]; ordinary cycles are not.
4. **Every node is reachable.** Breadth-first from the entry nodes. Any unvisited node is a definition bug. Emit `workflow.graph.unreachable_node` as a warning and mark those `NodeRun` rows `skipped` with `skipReason.kind = "unreachable"`. This is a warning, not a failure, because [[DynamicGraphs-Part01]] may connect them later.
5. **Every terminal node is reachable.** At least one node with zero outgoing edges must be reachable from an entry node. Otherwise `unreachable_terminal_node`. A workflow that can never end is invalid.
6. **Join arity.** Every node with a `join` config has at least two incoming edges. A join over one edge is a definition bug; fail `graph_invalid`.
7. **Quorum bounds.** For every join of kind `quorum`, `1 <= quorum.count <= incomingEdgeCount`. Otherwise `graph_invalid`.

# The Run Context Seed

The run context (the blackboard) is fully specified in Part 04. Initialization only needs to create it and put the trigger's values in the right scope.

```ts
type ContextSeed = {
  runScopeValues: Record<string, JsonValue>;
  triggerPayload: Record<string, JsonValue>;
  workspaceRefs: WorkspaceRefs;
  memorySeed?: MemorySeedRef;
};

type WorkspaceRefs = {
  workspaceId: string;
  projectId: string;
  projectRoot: string;
  sessionId: string;
};

type MemorySeedRef = {
  query: string;
  maxItems: number;
  resolvedItemIds: string[];
};
```

Seeding algorithm:

1. Create the root scope, `scopeId = "run"`. It is the only scope that exists at tick 0.
2. Write `trigger.payload` into the run scope under the reserved key `$input`. It is written **frozen**. No node may write to `$input`. An attempt fails with `ContextWriteError.kind = "reserved_key"`.
3. Write `WorkspaceRefs` under the reserved key `$workspace`. Also frozen.
4. Write `{ runId, workflowId, workflowVersion, startedAt, triggerKind }` under the reserved key `$run`. Also frozen.
5. If the workflow declares `memorySeed`, call [[MemoryManager-Part01]] with the query, take up to `maxItems` results, and write them under `$memory` as a frozen array. If the MemoryManager errors, this is NOT fatal: write `$memory` as an empty array and emit `workflow.run.memory_seed_degraded`. A memory index being cold MUST NOT block a run.
6. Write every default declared in the workflow's `defaults` block under its own key in the run scope, **unfrozen**. These are real starting values that nodes may overwrite.
7. Compute the seed hash: a stable SHA-256 over the canonical JSON of the whole run scope. Store it as `contextSeedHash` on the run. Replay compares this hash and refuses to proceed on mismatch.

The four reserved keys are `$input`, `$workspace`, `$run`, `$memory`. Any workflow whose `defaults` block declares a key starting with `$` fails validation at step 8 with `graph_invalid`.

# Initialization Events

Every one of these MUST be emitted. UI, logs, metrics, and Replay all depend on them.

```text
workflow.run.trigger_received     at step 1, before anything is allocated
workflow.run.deduplicated         at step 3, when an existing run is returned
workflow.run.rejected             on any failure, carrying RunInitError
workflow.run.created              after step 11 commits
workflow.run.context_seeded       after step 13, carrying contextSeedHash
workflow.run.started              after step 16, carrying runId and graphSnapshotId
workflow.run.overlap_skipped      cron trigger suppressed by an in-flight run
workflow.run.memory_seed_degraded memory seed failed but run continues
```

`workflow.run.rejected` MUST carry the full `RunInitError`, including `failedAtStep` and `rolledBackSteps`. A rejection with no reason is unusable in the UI and unusable in a bug report.

# Restart Behaviour

A run in a non-terminal state when the app closes does not survive as a live run. Only the record survives.

On startup, [[RuntimeManager-Part01]] recovery hands every non-terminal `WorkflowRun` to ExecutionFlow's recovery routine:

1. `restartGeneration += 1`. Every in-flight `NodeRun` from the previous generation is now stale and its late-arriving results MUST be rejected by generation check.
2. For each `NodeRun` in `dispatched` or `running`, transition to `failed` with `NodeFailure.kind = "runtime_restarted"`. The node's process is gone. There is no recovering it in place.
3. For each `NodeRun` in `ready`, reset to `pending`. Tick 1 of the new generation will recompute readiness and re-dispatch it.
4. Apply the node's `failurePolicy` to each `runtime_restarted` failure exactly as Part 05 defines. A node with `continue_on_error` lets the run proceed. A node with `fail_fast` terminates the run as `failed`.
5. If the run survives step 4, transition it back to `running` and schedule a tick.
6. Emit `workflow.run.recovered` with the count of nodes failed by restart.

A run MUST NOT resume mid-node. There is no such thing as a half-executed node in this design. See Part 05's attempt semantics for how retry-on-restart is configured per node.

# Related Documents

- [[ExecutionFlow-Part01]]
- [[ExecutionFlow-Part03]]
- [[ExecutionFlow-Diagrams]]
- [[WorkflowEngine-Part01]]
- [[DynamicGraphs-Part01]]
- [[EdgeTypes-Part01]]
- [[LoopNodes-Part01]]
- [[RuntimeManager-Part01]]
- [[PermissionManager-Part01]]
- [[MemoryManager-Part01]]
- [[Replay-Part01]]
</content>
</invoke>
