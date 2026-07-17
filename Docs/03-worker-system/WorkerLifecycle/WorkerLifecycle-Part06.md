---
title: WorkerLifecycle Specification - Part 06
status: draft
version: 1.0
tags:
  - worker-system
  - worker-lifecycle
  - checklist
related:
  - "[[WorkerLifecycle-Part01]]"
  - "[[WorkerLifecycle-Part05]]"
  - "[[WorkerExamples-Part01]]"
---

# WorkerLifecycle Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, States, and Object Model
Part 02 - Legal Transitions, Triggers, and Illegal Transitions
Part 03 - Per-State Allowed Operations and the Operation Gate
Part 04 - Timeouts, Heartbeats, and Health
Part 05 - Crash, Recovery, and Persistence Across Restart
Part 06 - Implementation Checklist, Examples, and Future Expansion

# Implementation Checklist

Build in this order. Each group depends on the one above it.

## Schema

- [ ] Create the `worker_lifecycle` table exactly as specified in Part 05.
- [ ] Create the `worker_transitions` table exactly as specified in Part 05.
- [ ] Create `idx_worker_lifecycle_deadline` as a partial index on `stateDeadlineAt`.
- [ ] Create `idx_worker_lifecycle_live` on `(state, workspaceId)`.
- [ ] Add a CHECK constraint restricting `state` to the thirteen literals.
- [ ] Add a CHECK constraint: `resumeState IS NOT NULL` only when `state = 'paused'`.

## Pure Core

- [ ] Define the `WorkerState` union with exactly thirteen members.
- [ ] Define the `WorkerTrigger` union with exactly twenty-two members.
- [ ] Build the transition table as a literal `Map<string, WorkerState>` keyed by `` `${from}:${trigger}` ``.
- [ ] Build the actor table as a literal map keyed the same way.
- [ ] Implement `canTransition(from, trigger): WorkerState | null` as a pure lookup.
- [ ] Build the 13x16 operation matrix as a literal nested object.
- [ ] Implement `gate(state, operation): GateResult` as a pure lookup.
- [ ] Implement `computeRetryable(state): boolean` per Part 03.
- [ ] Implement `computeHealth(missedHeartbeats): WorkerHealth` per Part 04.

## Tests Before Wiring

- [ ] Assert all 208 cells of the operation matrix.
- [ ] Assert every legal transition in the Part 02 table resolves.
- [ ] Assert every pair in the Illegal Transitions list returns null.
- [ ] Assert `canTransition("terminated", t)` is null for all 22 triggers.
- [ ] Assert `gate("terminated", op)` is denied for all 16 operations.
- [ ] Assert `gate(s, "accept_terminate")` is allowed for every state with a process.
- [ ] Assert `gate(s, "heartbeat")` is denied in `zombie`.

## Transition Engine

- [ ] Implement `transition(workerId, trigger, actor, reason): TransitionResult`.
- [ ] Use `BEGIN IMMEDIATE` for the transaction.
- [ ] Include `AND transitionSeq = ?` in the UPDATE WHERE clause.
- [ ] Return `state_changed_concurrently` when the UPDATE affects 0 rows.
- [ ] Resolve `resumeState` for the `paused + resume` transition.
- [ ] Set `resumeState = from` on entry to `paused`, null otherwise.
- [ ] Compute `stateDeadlineAt` from the timeout profile on every entry.
- [ ] Insert the `worker_transitions` row inside the same transaction.
- [ ] Emit the event only after COMMIT succeeds.
- [ ] Emit exactly one `worker.state_changed` plus any named convenience event.
- [ ] Run entry side effects after the commit, outside the transaction.
- [ ] Verify the actor against the ACTOR column before permitting the trigger.

## Watchdog and Health

- [ ] Implement one 5000ms watchdog sweep for the entire runtime.
- [ ] Query by the deadline index; do not scan all Workers.
- [ ] Process rows in `workerId` order.
- [ ] Fire expiry triggers through the public `transition` function only.
- [ ] Continue the sweep when one Worker's transition fails.
- [ ] Implement the 10_000ms health sweep separately from the watchdog.
- [ ] Reject heartbeats with a mismatched `restartGeneration`.
- [ ] Reject heartbeats denied by the operation gate.
- [ ] Emit `worker.health_changed` only on an actual change.
- [ ] Verify heartbeats do not reset deadlines.
- [ ] Verify `emit_progress` does not reset deadlines.

## Recovery

- [ ] Implement `recoverAllWorkers()` per the Part 05 algorithm.
- [ ] Call it from RuntimeManager startup before the runtime becomes `ready`.
- [ ] Increment `restartGeneration` for every survivor.
- [ ] Set `health = "unknown"` for every survivor.
- [ ] Implement the recovery table dispatch for all twelve non-terminal states.
- [ ] Implement the escaped-process sweep.
- [ ] Verify `osPid` command-line identity before any kill.
- [ ] Emit `worker.recovered` per survivor.
- [ ] Surface the recovered list in the UI on startup.

# Worked Examples

## Example 1: A Worker That Blocks on a Lock and Finishes

A Worker is asked to refactor `src/auth/session.ts`. Another Worker holds the file lock.

```text
seq  from          to            trigger              actor
------------------------------------------------------------------
1    requested     queued        admit                AdmissionControl
2    queued        spawning      schedule_grant       Scheduler
3    spawning      initializing  process_started      ProcessLifecycle
4    initializing  idle          handshake_ok         Worker
5    idle          working       task_assigned        Scheduler
6    working       blocked       gate_hit             LockManager
7    blocked       working       gate_released        LockManager
8    working       waiting       await_external       Worker
9    waiting       working       external_returned    ProviderClient
10   working       idle          task_completed       Worker
11   idle          terminating   terminate            Parent
12   terminating   terminated    cleanup_done         TerminationEngine
```

Concrete values at seq 6:

```ts
{
  workerId: "wkr_01HQ8F3K2M",
  state: "blocked",
  previousState: "working",
  resumeState: null,
  stateEnteredAt: "2026-07-17T10:14:02.881Z",
  stateDeadlineAt: null,
  transitionSeq: 6,
  lastHeartbeatAt: "2026-07-17T10:14:09.004Z",
  missedHeartbeats: 0,
  health: "healthy",
  processId: "proc_7742",
  restartGeneration: 0
}
```

Note `stateDeadlineAt` is null. `blocked` is not stallable. The Worker sat blocked for 41 seconds and was never at risk of being killed, because a lock wait is somebody else's problem to resolve, not a Worker failure.

Note `health` stayed `healthy` throughout the block. The process was fine. It was waiting, correctly, and heartbeating while it did.

## Example 2: A Worker That Stalls and Is Reaped

A Worker enters a reasoning loop, emitting progress the whole time.

```text
seq  from          to            trigger              actor
------------------------------------------------------------------
1    requested     queued        admit                AdmissionControl
2    queued        spawning      schedule_grant       Scheduler
3    spawning      initializing  process_started      ProcessLifecycle
4    initializing  idle          handshake_ok         Worker
5    idle          working       task_assigned        Scheduler
--   1800 seconds pass. 180 heartbeats arrive. 47 progress events arrive.
6    working       failing       deadline_exceeded    LifecycleWatchdog
7    failing       terminating   cleanup_done         LifecycleEngine
8    terminating   terminated    cleanup_done         TerminationEngine
```

The failure record written at seq 6:

```ts
{
  workerId: "wkr_01HQ8G9P4X",
  cause: "work_deadline_exceeded",
  detail: "working state exceeded 1800000ms; 47 progress events received",
  stateAtFailure: "working",
  transitionSeqAtFailure: 5,
  lastOutputTail: "...analyzing imports in src/auth/session.ts...",
  detectedBy: { kind: "runtime_service", id: "LifecycleWatchdog" },
  at: "2026-07-17T10:44:02.113Z"
}
```

This is the example that justifies the rule from Part 04. The Worker was `healthy` at every sweep. It heartbeated 180 times. It emitted 47 progress events. If any of those had reset the deadline, this Worker would still be running, and it would still be running tomorrow. Liveness is not progress.

# Common Mistakes

Deriving state from the OS process. The OS cannot tell you `blocked` from `waiting`.

Letting heartbeats or progress events reset the `working` deadline. See Example 2.

Caching a gate result. State changes between the check and the operation.

Omitting `AND transitionSeq = ?` from the UPDATE. Without it, two concurrent triggers both succeed and one transition vanishes.

Emitting the event before the commit. The UI shows a state the database never recorded.

Adding a `failing -> idle` transition to "recover" a Worker. Failure is terminal for that Worker's identity. Retry means a new Worker.

Adding a fourteenth state. Every state you want already exists; you have misread a transition.

Attempting to reattach to an orphaned process on restart.

Killing an `osPid` without verifying the command line.

Running one timer per Worker instead of one sweep.

Putting the gate check inside each runtime service instead of at the Worker's single operation entry point.

# Future Expansion

Per-role timeout profiles. A `reviewer` Worker and a `builder` Worker plausibly want different `workingMs`. The profile type already supports this; only the resolution logic in WorkerCreation needs to change.

Adaptive deadlines based on historical percentiles per role. Requires WorkerMetrics history. MUST remain a bounded multiplier over the profile default, and a Worker MUST still never influence its own deadline.

Checkpointing to make `working` resumable across a restart. This would add a `checkpointed` sub-record, not a state. It is a large change and it requires the Worker CLI to support serializing its conversation, which no current CLI does.

Suspension to disk for `paused`, so a paused Worker survives a restart. Same dependency as checkpointing.

A `worker.state_changed` replay driver that reconstructs any Worker's full history from `worker_transitions` for debugging.

# Related Documents

- [[WorkerLifecycle-Part01]]
- [[WorkerLifecycle-Part05]]
- [[WorkerLifecycle-Diagrams]]
- [[WorkerCreation-Part01]]
- [[WorkerTermination-Part01]]
- [[WorkerExamples-Part01]]
- [[WorkerMetrics-Part01]]
</content>
