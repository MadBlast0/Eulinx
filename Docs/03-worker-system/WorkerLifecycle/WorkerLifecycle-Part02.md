---
title: WorkerLifecycle Specification - Part 02
status: draft
version: 1.0
tags:
  - worker-system
  - worker-lifecycle
  - transitions
related:
  - "[[WorkerLifecycle-Part01]]"
  - "[[WorkerLifecycle-Part03]]"
  - "[[Scheduler-Part01]]"
---

# WorkerLifecycle Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, States, and Object Model
Part 02 - Legal Transitions, Triggers, and Illegal Transitions
Part 03 - Per-State Allowed Operations and the Operation Gate
Part 04 - Timeouts, Heartbeats, and Health
Part 05 - Crash, Recovery, and Persistence Across Restart
Part 06 - Implementation Checklist, Examples, and Future Expansion

# Purpose

This part defines every legal transition, the trigger that causes it, and the rule that every other transition is illegal.

The transition table below is exhaustive. If a `(from, trigger)` pair is not in it, the transition MUST be rejected.

# Trigger Enum

A trigger is the named cause of a transition. Triggers are the only way state changes.

```ts
type WorkerTrigger =
  | "admit"
  | "admission_rejected"
  | "schedule_grant"
  | "cancel"
  | "process_started"
  | "process_start_failed"
  | "handshake_ok"
  | "handshake_failed"
  | "task_assigned"
  | "task_completed"
  | "await_external"
  | "external_returned"
  | "gate_hit"
  | "gate_released"
  | "pause"
  | "resume"
  | "fatal_error"
  | "deadline_exceeded"
  | "terminate"
  | "cleanup_done"
  | "process_unkillable"
  | "reaped";
```

# The Transition Table

This table is normative. Implement it as a literal lookup, not as a chain of `if` statements.

```text
FROM           TRIGGER                 TO             ACTOR
------------------------------------------------------------------
requested      admit                   queued         AdmissionControl
requested      admission_rejected      terminated     AdmissionControl
requested      cancel                  terminated     User or Parent

queued         schedule_grant          spawning       Scheduler
queued         cancel                  terminated     User or Parent

spawning       process_started         initializing   ProcessLifecycle
spawning       process_start_failed    failing        ProcessLifecycle
spawning       deadline_exceeded       failing        LifecycleWatchdog

initializing   handshake_ok            idle           Worker
initializing   handshake_failed        failing        Worker or Watchdog
initializing   deadline_exceeded       failing        LifecycleWatchdog

idle           task_assigned           working        Scheduler
idle           pause                   paused         User or Runtime
idle           terminate               terminating    User or Parent
idle           deadline_exceeded       terminating    LifecycleWatchdog

working        await_external          waiting        Worker
working        gate_hit                blocked        Runtime service
working        task_completed          idle           Worker
working        pause                   paused         User or Runtime
working        fatal_error             failing        Worker or Runtime
working        terminate               terminating    User or Parent
working        deadline_exceeded       failing        LifecycleWatchdog

waiting        external_returned       working        Runtime service
waiting        gate_hit                blocked        Runtime service
waiting        fatal_error             failing        Runtime service
waiting        deadline_exceeded       failing        LifecycleWatchdog
waiting        terminate               terminating    User or Parent

blocked        gate_released           working        Runtime service
blocked        fatal_error             failing        Runtime service
blocked        terminate               terminating    User or Parent
blocked        cancel                  terminating    User or Parent

paused         resume                  resumeState    User or Runtime
paused         terminate               terminating    User or Parent

failing        cleanup_done            terminating    LifecycleEngine

terminating    cleanup_done            terminated     TerminationEngine
terminating    process_unkillable      zombie         ProcessLifecycle
terminating    deadline_exceeded       zombie         LifecycleWatchdog

zombie         reaped                  terminated     ZombieReaper
```

# The Resume Transition

`paused + resume` is the only transition whose destination is not a literal. It resolves to `resumeState`, which MUST be one of `idle` or `working`.

Rules:

- On entering `paused`, `resumeState` MUST be set to the state being left.
- `resumeState` MUST be `idle` or `working`. A Worker MUST NOT be paused from `waiting` or `blocked`; see Illegal Transitions.
- On `resume`, the engine sets `state = resumeState`, then clears `resumeState` to null.
- If `resumeState` is null when `resume` fires, that is a corrupt record. The engine MUST transition to `failing` with cause `corrupt_lifecycle_record`.

# Illegal Transitions

Every `(from, trigger)` pair absent from the transition table is illegal. These specific illegal pairs are called out because implementers reach for them.

```text
ILLEGAL                              WHY
----------------------------------------------------------------------
working -> terminated                Skips cleanup. Locks and artifacts leak.
failing -> idle                      Failure is not recoverable in place.
                                     Recover by creating a new Worker.
failing -> terminated                Skips the death procedure.
terminated -> anything               terminated is sealed and final.
waiting -> paused                    Cannot pause mid-flight on an external
                                     call. The response would arrive into a
                                     paused Worker. Wait for it, then pause.
blocked -> paused                    Already suspended. Pausing a blocked
                                     Worker produces two suspension reasons
                                     and an ambiguous resume.
idle -> waiting                      Nothing to wait for without a task.
idle -> blocked                      Nothing to block without a task.
queued -> initializing               Skips process creation.
spawning -> idle                     Skips the readiness handshake. The
                                     Worker would be handed a task before
                                     it can accept one.
zombie -> working                    A zombie's record is dead. Its process
                                     is an escapee, not a Worker.
paused -> failing                    A paused Worker is not doing anything
                                     that can fail. Terminate it instead.
```

# Transition Rejection

An illegal transition is a bug, not a runtime condition. The engine MUST NOT silently ignore it.

```ts
type TransitionResult =
  | { ok: true; record: WorkerLifecycleRecord; event: WorkerLifecycleEvent }
  | { ok: false; error: TransitionError };

type TransitionError = {
  kind:
    | "illegal_transition"
    | "worker_not_found"
    | "state_changed_concurrently"
    | "corrupt_lifecycle_record"
    | "persistence_failed";
  workerId: string;
  attemptedFrom: WorkerState;
  attemptedTrigger: WorkerTrigger;
  actualState?: WorkerState;
  message: string;
};
```

On `illegal_transition` the engine MUST:

1. Leave the Worker's state unchanged.
2. Write a `worker.transition_rejected` row to the audit log.
3. Emit `worker.transition_rejected` on the EventBus.
4. Return `{ ok: false }` to the caller.
5. MUST NOT throw past the caller and MUST NOT crash the runtime.

# The Transition Algorithm

This algorithm is normative. Transcribe it directly.

1. Receive `(workerId, trigger, actor, reason)`.
2. Open a SQLite transaction with `BEGIN IMMEDIATE`.
3. `SELECT state, transitionSeq, resumeState FROM worker_lifecycle WHERE workerId = ?`.
4. If no row, roll back and return `{ ok: false, kind: "worker_not_found" }`.
5. Let `from` be the selected state.
6. Look up `(from, trigger)` in the transition table.
7. If absent, roll back and return `{ ok: false, kind: "illegal_transition" }`.
8. Let `to` be the table's destination. If `to` is the literal `resumeState`, resolve it per the Resume Transition rules. If resolution fails, set `to = "failing"` and `failureCause = "corrupt_lifecycle_record"`.
9. Verify the actor is permitted to fire this trigger per the ACTOR column. If not, roll back and return `illegal_transition`.
10. Compute `nextSeq = transitionSeq + 1`.
11. Compute `stateDeadlineAt` for `to` per Part 04. If `to` is not stallable, set it to null.
12. If `to` is `paused`, set `resumeState = from`. Otherwise set `resumeState = null`.
13. `UPDATE worker_lifecycle SET state = to, previousState = from, resumeState = ?, stateEnteredAt = now, stateDeadlineAt = ?, transitionSeq = nextSeq, updatedAt = now WHERE workerId = ? AND transitionSeq = ?` using the original `transitionSeq` in the WHERE clause.
14. If the UPDATE affected 0 rows, another actor transitioned concurrently. Roll back and return `{ ok: false, kind: "state_changed_concurrently" }`. The caller MAY retry once from step 2.
15. `INSERT INTO worker_transitions (workerId, seq, from, to, trigger, actor, reason, at)`.
16. COMMIT. If the commit fails, return `{ ok: false, kind: "persistence_failed" }` and do not emit anything.
17. Only after a successful commit, emit the lifecycle event on the EventBus.
18. Run the entry side effects for `to` as defined in Part 03. These run outside the transaction and MUST be idempotent.
19. Return `{ ok: true }`.

Step 13's `transitionSeq` guard is the concurrency control for the entire state machine. It MUST NOT be omitted.

# Lifecycle Events

Exactly one event per accepted transition.

```ts
type WorkerLifecycleEvent = {
  type: "worker.state_changed";
  workerId: string;
  workspaceId: string;
  sessionId: string;
  seq: number;
  from: WorkerState;
  to: WorkerState;
  trigger: WorkerTrigger;
  actor: RuntimeActorRef;
  reason: string;
  restartGeneration: number;
  at: string;
};
```

Named convenience events MUST also be emitted for these transitions, in addition to `worker.state_changed`, because the UI subscribes to them directly:

```text
* -> initializing    worker.started
* -> idle (first)    worker.ready
* -> working         worker.task_started
working -> idle      worker.task_completed
* -> blocked         worker.blocked
* -> paused          worker.paused
* -> failing         worker.failing
* -> terminated      worker.terminated
* -> zombie          worker.zombie_detected
```

# AI Notes

Implement the transition table as data. A `Map<string, WorkerState>` keyed by `` `${from}:${trigger}` `` is correct. A nested `switch` is not, because it will drift from this document the first time someone edits it.

Do not add a `force` flag to the transition function. Every caller will use it.

Do not retry `state_changed_concurrently` in a loop. Retry once. If it fails twice, two actors are fighting over one Worker, and that is a design bug you must surface, not paper over.

The ACTOR column is enforced, not documentation. A Worker MUST NOT be able to fire `schedule_grant` on itself. That check in step 9 is what stops a compromised Worker from scheduling itself.

# Related Documents

- [[WorkerLifecycle-Part01]]
- [[WorkerLifecycle-Part03]]
- [[WorkerLifecycle-Diagrams]]
- [[Scheduler-Part01]]
- [[EventBus-Part01]]
</content>
