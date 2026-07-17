---
title: WorkflowEngine Specification - Part 02
status: draft
version: 1.0
tags:
  - workflow-engine
  - workflow-engine-core
  - graph
  - persistence
related:
  - "[[WorkflowEngine-Part01]]"
  - "[[WorkflowEngine-Part03]]"
  - "[[SQLiteSchema-Part01]]"
  - "[[EdgeTypes-Part01]]"
---

# WorkflowEngine Specification (Part 02)

Graph representation. This part defines exactly how the graph exists in memory and exactly how it exists in SQLite, and why those two representations are deliberately different.

# Two Representations, One Truth

```text
SQLite   is the truth.        Durable. Survives restart. Slow to query per tick.
Memory   is the index.        Derived. Rebuilt from SQLite on load. Fast.
```

The rule:

- Every write goes to SQLite first, inside a transaction, and updates the in-memory mirror only after commit.
- Every read during a tick goes to memory.
- On app start, the mirror is rebuilt from SQLite by a pure function. The mirror MUST NOT contain information that is not derivable from SQLite.

That last rule is what makes crash recovery possible. If the mirror holds a fact that SQLite does not, a restart loses it, and the run resumes into a state that never existed.

# The Frozen Graph Snapshot

A run does not reference a live `Workflow`. It references a **snapshot**.

When a run is created, the engine serializes the workflow's nodes and edges into an immutable snapshot row and stores its id on the run. The user may then edit the workflow freely. The running graph does not change.

```ts
type GraphSnapshot = {
  snapshotId: string;
  workflowId: string;
  workflowVersion: number;
  nodes: NodeDefinition[];
  edges: EdgeDefinition[];
  createdAt: string;
  contentHash: string;
};
```

`contentHash` is the SHA-256 of the canonical JSON serialization of `nodes` and `edges`, with object keys sorted and arrays ordered by id. It is the replay identity of the graph. Two runs with the same `contentHash` ran the same graph, whatever the workflow has since become.

MUST: the snapshot is written in the same transaction as the run record.

MUST NOT: a snapshot is never updated in place. A dynamic mutation (see [[DynamicGraphs-Part01]]) creates a **new** snapshot, links it via `supersedesSnapshotId`, and updates the run's `graphSnapshotId` pointer. The old snapshot stays for replay.

# Node and Edge Definitions

These are the static, authored shapes. They carry no runtime state.

```ts
type NodeDefinition = {
  nodeId: NodeId;
  kind: NodeKind;
  label: string;
  config: unknown;
  inputPorts: PortDefinition[];
  outputPorts: PortDefinition[];
  retryPolicy: RetryPolicy;
  timeoutMs: number;
  layout: { x: number; y: number };
  createdBy: "user" | "orchestrator" | "template" | "plugin";
  pluginId?: string;
};

type EdgeDefinition = {
  edgeId: EdgeId;
  kind: EdgeKind;
  fromNodeId: NodeId;
  fromPortId: string;
  toNodeId: NodeId;
  toPortId: string;
  condition?: string;
};
```

`config` is `unknown` on purpose. Its concrete type is determined by `kind` and is defined per kind in [[NodeTypes-Part01]]. The engine MUST NOT interpret `config`. It passes it through to the node handler. Only the handler's registered schema validates it.

`layout` is presentation only. The engine MUST NOT read `layout` for any purpose. Sorting by `x` to determine order is a bug that looks like a feature.

# Runtime Node State

This is the mutable per-run, per-node record. It is separate from `NodeDefinition` because one definition may execute many times inside a loop.

```ts
type NodeRuntimeState = {
  runId: WorkflowRunId;
  nodeId: NodeId;
  iterationIndex: number;

  state: NodeState;
  remainingDeps: number;
  attempt: number;

  executionId?: string;
  startedAt?: string;
  endedAt?: string;

  outputs?: Record<string, PortValueRef>;
  failure?: NodeFailure;
  skipReason?: SkipReason;
};

type NodeState =
  | "pending"
  | "ready"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "cancelled";

type SkipReason =
  | "branch_not_taken"
  | "upstream_failed"
  | "upstream_skipped"
  | "loop_exited"
  | "run_cancelled";
```

The primary key is the triple `(runId, nodeId, iterationIndex)`. For a node outside any loop, `iterationIndex` is always `0`. Inside a loop it is the loop's current iteration. This is why the dispatch-once invariant is stated per triple and not per node: a loop body node legitimately runs many times, and each run is a distinct row.

`remainingDeps` is the readiness counter. Part 03 defines it fully. It is stored, not recomputed, because recomputing it after a Condition node has skipped a branch requires a graph walk that gives the wrong answer.

`outputs` holds `PortValueRef`, not the value. See Part 05. Large values live in the context store; the node row holds a reference. A node that emitted a 40 MB artifact MUST NOT put 40 MB in this row.

# The In-Memory Mirror

```ts
type GraphMirror = {
  snapshotId: string;
  nodes: Map<NodeId, NodeDefinition>;
  edges: Map<EdgeId, EdgeDefinition>;

  outgoing: Map<NodeId, EdgeId[]>;
  incoming: Map<NodeId, EdgeId[]>;

  states: Map<string, NodeRuntimeState>;
  readySet: Set<string>;
  runningSet: Set<string>;

  topoOrder: NodeId[];
};
```

The `string` key of `states`, `readySet`, and `runningSet` is the composite `${nodeId}#${iterationIndex}`. Use a single canonical helper `stateKey(nodeId, iterationIndex)` and never build the key inline. Two spellings of the key is a class of bug that takes a day to find.

`outgoing` and `incoming` are adjacency indexes built once at load. Both MUST be sorted by `edgeId` at build time. Their order is otherwise nondeterministic and Part 07 forbids that.

`topoOrder` is a precomputed topological ordering of the node ids, ignoring loop back-edges. It is used only as a **tiebreak** for dispatch order and for validation. It is not the execution order; the ready set is. Storing it makes the "which of these two ready nodes goes first" question deterministic and cheap.

`readySet` and `runningSet` are caches over `states`. They MUST be kept exactly consistent with `states`. Every state write goes through one function that updates both, or they will drift.

# Building the Mirror

Called at run start and at every app restart. It is a pure function of SQLite content.

```text
buildMirror(runId) -> GraphMirror

 1. SELECT the run row. If absent, return error run_not_found.
 2. SELECT the graph snapshot by run.graphSnapshotId.
    If absent, return error snapshot_missing. This is unrecoverable; the run
    MUST transition to failed with kind recovery_impossible.
 3. Deserialize nodes and edges from the snapshot.
 4. Verify contentHash matches a recomputed hash of the deserialized content.
    On mismatch, fail with recovery_impossible. A corrupted snapshot MUST NOT
    be guessed at.
 5. Build nodes Map and edges Map.
 6. Build outgoing and incoming Maps. Sort every EdgeId[] by edgeId ascending.
 7. Compute topoOrder by Kahn's algorithm over control and dependency edges
    only, excluding edges marked as loop back-edges.
    If Kahn's algorithm terminates with nodes remaining, the graph has an
    illegal cycle: fail with graph_invalid and list the remaining node ids.
    Break ties in Kahn's queue by nodeId ascending, so topoOrder is stable.
 8. SELECT all node_runtime_state rows for runId. Populate states.
 9. For any (nodeId, iterationIndex=0) with no row, insert a row with
    state=pending, attempt=0, and remainingDeps computed per Part 03 step 1.
10. Rebuild readySet   = every key whose state == "ready".
11. Rebuild runningSet = every key whose state == "running".
12. Return the mirror.
```

Step 11 deserves a warning. On a restart, a row saying `running` is a **lie**: the process it referred to died with the app. Part 06 defines the reconciliation that converts those rows before the first tick. `buildMirror` reports them faithfully; it does not fix them. Keeping the "read truth" and "repair truth" steps separate is what makes both testable.

# SQLite Schema

Owned by [[SQLiteSchema-Part01]]; restated here because implementers need it inline and the style guide forbids "see elsewhere".

```sql
CREATE TABLE workflow_runs (
  run_id                TEXT PRIMARY KEY,
  workflow_id           TEXT NOT NULL,
  workflow_version      INTEGER NOT NULL,
  workspace_id          TEXT NOT NULL,
  project_id            TEXT NOT NULL,
  session_id            TEXT NOT NULL,
  state                 TEXT NOT NULL,
  run_seq               INTEGER NOT NULL DEFAULT 0,
  mode                  TEXT NOT NULL,
  trigger_json          TEXT NOT NULL,
  graph_snapshot_id     TEXT NOT NULL,
  context_id            TEXT NOT NULL,
  determinism_seed      TEXT NOT NULL,
  restart_generation    INTEGER NOT NULL DEFAULT 0,
  node_count            INTEGER NOT NULL,
  completed_node_count  INTEGER NOT NULL DEFAULT 0,
  failed_node_count     INTEGER NOT NULL DEFAULT 0,
  skipped_node_count    INTEGER NOT NULL DEFAULT 0,
  failure_json          TEXT,
  started_at            TEXT NOT NULL,
  paused_at             TEXT,
  ended_at              TEXT
);

CREATE TABLE graph_snapshots (
  snapshot_id            TEXT PRIMARY KEY,
  workflow_id            TEXT NOT NULL,
  workflow_version       INTEGER NOT NULL,
  supersedes_snapshot_id TEXT,
  nodes_json             TEXT NOT NULL,
  edges_json             TEXT NOT NULL,
  content_hash           TEXT NOT NULL,
  created_at             TEXT NOT NULL
);

CREATE TABLE node_runtime_state (
  run_id          TEXT NOT NULL,
  node_id         TEXT NOT NULL,
  iteration_index INTEGER NOT NULL,
  state           TEXT NOT NULL,
  remaining_deps  INTEGER NOT NULL,
  attempt         INTEGER NOT NULL DEFAULT 0,
  execution_id    TEXT,
  outputs_json    TEXT,
  failure_json    TEXT,
  skip_reason     TEXT,
  started_at      TEXT,
  ended_at        TEXT,
  PRIMARY KEY (run_id, node_id, iteration_index)
);

CREATE TABLE node_transitions (
  run_id          TEXT NOT NULL,
  seq             INTEGER NOT NULL,
  node_id         TEXT NOT NULL,
  iteration_index INTEGER NOT NULL,
  from_state      TEXT NOT NULL,
  to_state        TEXT NOT NULL,
  reason          TEXT NOT NULL,
  at              TEXT NOT NULL,
  PRIMARY KEY (run_id, seq)
);

CREATE INDEX idx_nrs_ready
  ON node_runtime_state (run_id, state);
CREATE INDEX idx_runs_active
  ON workflow_runs (state) WHERE state IN ('running','pausing','cancelling','paused');
```

`node_transitions` is the replay log. Every state change appends exactly one row with the run's new `run_seq` as `seq`. It MUST NOT be pruned while the run is retained. It is the answer to "why did this node run".

`idx_runs_active` is a partial index. It exists so that the restart sweep in Part 06 is a single indexed scan rather than a full table scan over every run the user has ever executed.

# The Write Path

Every node state change follows this exact path. No exceptions, no shortcuts for "simple" transitions.

```text
 1. BEGIN IMMEDIATE
 2. SELECT run_seq FROM workflow_runs WHERE run_id = ?
      -> observedSeq
 3. SELECT state FROM node_runtime_state
      WHERE run_id=? AND node_id=? AND iteration_index=?
      -> fromState
    If no row: ROLLBACK, return error node_state_missing.
 4. Verify (fromState -> toState) is a legal transition per
    [[NodeArchitecture-Part03]]. If not: ROLLBACK, return
    error illegal_node_transition. Do NOT coerce.
 5. UPDATE node_runtime_state SET state=?, ... 
      WHERE run_id=? AND node_id=? AND iteration_index=? AND state=<fromState>
    If 0 rows affected: ROLLBACK, return error node_changed_concurrently.
    The caller MUST re-read and re-decide. It MUST NOT retry blindly.
 6. UPDATE workflow_runs SET run_seq = observedSeq + 1, <counters>
      WHERE run_id=? AND run_seq=observedSeq
    If 0 rows affected: ROLLBACK, return error run_changed_concurrently.
 7. INSERT INTO node_transitions (run_id, seq, ...) 
      VALUES (?, observedSeq + 1, ...)
 8. COMMIT
    If commit fails: return error persistence_failed. The mirror MUST NOT be
    updated. The run MUST transition to failed with kind persistence_failed.
 9. Only now: update the in-memory mirror (states, readySet, runningSet).
10. Only now: emit workflow.node.state_changed on the EventBus.
```

Step 5 and step 6 are both conditional. Together they mean: a tick that observed stale state cannot write. This is the same optimistic-concurrency pattern [[WorkerLifecycle-Part01]] uses for `transitionSeq`, and it is deliberate that the two services look identical here. Implementers should be able to move between them without relearning the discipline.

Step 9 and step 10 are after the commit, in that order. The mirror is updated before the event because a UI subscriber may synchronously call back into the engine to read state, and it MUST see the state the event describes.

# Error Cases

`run_not_found` - the run id does not exist. Return to caller. No side effects.

`snapshot_missing` - `graph_snapshot_id` points at nothing. Unrecoverable. Transition run to `failed` with kind `recovery_impossible`. Emit `workflow.run.failed`. Do not attempt to reconstruct the graph from `node_runtime_state`; the result would be a graph that never ran.

`snapshot_corrupt` - `content_hash` does not match the content. Same handling as `snapshot_missing`. MUST NOT proceed on a "close enough" graph.

`graph_invalid` - Kahn's algorithm left nodes unvisited, meaning an illegal cycle. Transition run to `failed` with kind `graph_invalid`, and set `failure.failedNodeIds` to the remaining node ids so the UI can highlight the cycle.

`node_state_missing` - a state row is absent for a node in the snapshot. This means step 9 of `buildMirror` did not run. It is an engine bug, not a data condition. Log at error level with the run id and node id, then fail the run with `persistence_failed` rather than inserting a row on the fly. Silently healing a missing row hides the bug and produces a run whose `node_transitions` log has a gap.

`node_changed_concurrently` - another tick moved the node. The caller re-reads and re-decides. This is expected under parallel dispatch and MUST NOT be logged as an error.

`run_changed_concurrently` - another tick bumped `run_seq`. Same handling.

`persistence_failed` - the commit itself failed, typically SQLITE_BUSY or a disk error. The run transitions to `failed` with kind `persistence_failed`. MUST NOT retry the transaction in a loop: if SQLite cannot commit, the next tick cannot either, and a retry loop turns a disk-full condition into a spin.

# AI Notes

Do not put `layout` into any decision. If a code path reads `node.layout.x` outside of an IPC response to the UI, delete that code path.

Do not store output values in `node_runtime_state.outputs_json`. Store `PortValueRef` references. A Builder node emitting a large patch will otherwise put megabytes into a row that every tick reads, and the tick becomes O(size of all outputs).

Do not rebuild `topoOrder` every tick. It is a property of the snapshot. Build it once when the mirror is built. If a dynamic mutation replaces the snapshot, rebuild it then, and only then.

Do not skip step 4's legality check because step 5's conditional update "already handles it". They catch different things. Step 5 catches a concurrent writer. Step 4 catches your own bug of moving a node from `succeeded` back to `ready`. The conditional update would happily perform that write.

Do not update the mirror inside the transaction. If the commit fails, the mirror now describes a state SQLite does not have, and every subsequent tick reads a fiction. Mirror after commit, always.

# Related Documents

- [[WorkflowEngine-Part01]]
- [[WorkflowEngine-Part03]]
- [[WorkflowEngine-Part05]]
- [[WorkflowEngine-Part06]]
- [[WorkflowEngine-Diagrams]]
- [[NodeArchitecture-Part03]]
- [[EdgeTypes-Part01]]
- [[DynamicGraphs-Part01]]
- [[SQLiteSchema-Part01]]
- [[EventBus-Part01]]
</content>
</invoke>
