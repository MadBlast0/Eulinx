---
title: WorkerLifecycle Specification - Part 04
status: draft
version: 1.0
tags:
  - worker-system
  - worker-lifecycle
  - health
related:
  - "[[WorkerLifecycle-Part03]]"
  - "[[WorkerLifecycle-Part05]]"
  - "[[WorkerMonitoring-Part01]]"
---

# WorkerLifecycle Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, States, and Object Model
Part 02 - Legal Transitions, Triggers, and Illegal Transitions
Part 03 - Per-State Allowed Operations and the Operation Gate
Part 04 - Timeouts, Heartbeats, and Health
Part 05 - Crash, Recovery, and Persistence Across Restart
Part 06 - Implementation Checklist, Examples, and Future Expansion

# Purpose

This part defines the three independent mechanisms that detect a Worker that has stopped making progress:

```text
Timeouts    detect a state that has lasted too long.
Heartbeats  detect a process that has stopped responding.
Health      is the derived summary the UI and Scheduler read.
```

These are three separate mechanisms and MUST NOT be collapsed into one. A Worker can be heartbeating perfectly while stuck in a state far past its deadline. A Worker can be one second into `working` with a dead process. Each condition needs its own detector.

# Stallable States and Their Deadlines

A state is stallable if it has a deadline. On entering a stallable state, the engine sets `stateDeadlineAt = now + timeout`. On exiting, it clears it.

```text
STATE          STALLABLE  DEFAULT TIMEOUT   ON EXPIRY
------------------------------------------------------------------
requested      yes        60s               cancel -> terminated
queued         no         none              (Scheduler owns the queue)
spawning       yes        30s               deadline_exceeded -> failing
initializing   yes        60s               deadline_exceeded -> failing
idle           yes        900s              deadline_exceeded -> terminating
working         yes        1800s            deadline_exceeded -> failing
waiting         yes        300s             deadline_exceeded -> failing
blocked         no        none              (waits for a human or a lock)
paused          no        none              (waits for a human)
failing         yes        30s              cleanup_done -> terminating
terminating     yes        30s              deadline_exceeded -> zombie
terminated      no        none              terminal
zombie          yes        300s             escalate to the reaper
```

Three of these need justification.

`queued` is not stallable. The Scheduler owns queue fairness and starvation. A lifecycle timeout on `queued` would fight the Scheduler for the same job and both would lose. See [[Scheduler-Part05]].

`blocked` is not stallable, ever. This is the whole reason `blocked` exists as a state distinct from `waiting`. A Worker awaiting a human decision MUST NOT be killed by a timer. If a block needs a deadline, the actor that created the gate owns that deadline, not the lifecycle engine.

`idle` is stallable at 900s but expires to `terminating`, not `failing`. An idle Worker that nobody has given work to for fifteen minutes has not failed. It is simply unwanted, and reaping it reclaims its slot and its budget cleanly.

# Timeout Configuration

Timeouts are per-Worker, resolved at creation from the Worker's profile, and immutable thereafter.

```ts
type WorkerTimeoutProfile = {
  requestedMs: number;
  spawningMs: number;
  initializingMs: number;
  idleMs: number;
  workingMs: number;
  waitingMs: number;
  failingMs: number;
  terminatingMs: number;
  zombieMs: number;
};

const DEFAULT_TIMEOUT_PROFILE: WorkerTimeoutProfile = {
  requestedMs: 60_000,
  spawningMs: 30_000,
  initializingMs: 60_000,
  idleMs: 900_000,
  workingMs: 1_800_000,
  waitingMs: 300_000,
  failingMs: 30_000,
  terminatingMs: 30_000,
  zombieMs: 300_000,
};
```

A Worker MUST NOT be able to modify its own timeout profile. A Worker MUST NOT be able to extend its own deadline. Progress is the only thing that resets a deadline, and progress means a state transition.

`emit_progress` MUST NOT reset the `working` deadline. This is a rule implementers break immediately, reasoning that a Worker reporting progress is making progress. It is not. A Worker looping forever while emitting cheerful progress messages is the exact failure the `working` deadline exists to catch.

# The Watchdog Algorithm

One watchdog runs for the whole runtime. It MUST NOT be one timer per Worker.

1. Every 5000ms, wake.
2. `SELECT workerId, state, stateDeadlineAt FROM worker_lifecycle WHERE stateDeadlineAt IS NOT NULL AND stateDeadlineAt <= now AND state != 'terminated'`.
3. For each row, in `workerId` order for determinism:
4. Fire the trigger from the ON EXPIRY column of the deadline table via the normal transition function from Part 02.
5. If the transition returns `state_changed_concurrently`, skip this Worker. It moved on its own; the deadline is stale.
6. If the transition returns `illegal_transition`, log it as a watchdog bug and skip. MUST NOT force the transition.
7. Continue to the next row. One Worker's failure MUST NOT abort the sweep.
8. Sleep until the next tick.

The watchdog MUST use the same transition function every other caller uses. It MUST NOT write state directly. A watchdog with a private path into the state table is a watchdog that will disagree with the state machine.

# Heartbeats

A heartbeat is the Worker process telling the runtime it is alive. It carries no semantic payload and MUST NOT be trusted for anything except liveness.

```ts
type WorkerHeartbeat = {
  workerId: string;
  restartGeneration: number;
  seq: number;
  processId: string;
  at: string;
};
```

Contract:

- The Worker process MUST send a heartbeat every 10_000ms.
- The runtime MUST tolerate jitter of 5_000ms.
- The runtime MUST reject a heartbeat whose `restartGeneration` does not match the current record. That heartbeat is from a pre-crash process that should be dead, and accepting it would mask a zombie.
- The runtime MUST reject a heartbeat in states where `heartbeat` is `N` in the Part 03 matrix.
- A heartbeat MUST NOT reset any state deadline.
- A heartbeat MUST NOT trigger a state transition.

That last pair of rules is the point. Heartbeats feed health. Health does not move the state machine. Conflating them means a chatty stuck Worker lives forever.

# The Health Model

`health` is derived, never set directly.

```text
missedHeartbeats  HEALTH          MEANING
------------------------------------------------------------------
0                 healthy         Heartbeat arrived within window.
1-2               degraded        Late. Probably load. Keep going.
3-5               unresponsive    Process is likely wedged.
6+                unresponsive    Escalate: fire fatal_error.
n/a               unknown         No process expected, or seq gap
                                  detected, or record recovered and
                                  not yet re-established.
```

The health sweep:

1. Every 10_000ms, wake.
2. For each Worker in a state where `heartbeat` is `Y`:
3. If `now - lastHeartbeatAt <= 15_000ms`, set `missedHeartbeats = 0`, `health = "healthy"`.
4. Else increment `missedHeartbeats`.
5. Recompute `health` from the table above.
6. If `missedHeartbeats >= 6`, fire `fatal_error` with cause `heartbeat_lost` through the normal transition function.
7. Emit `worker.health_changed` only when `health` differs from its previous value. MUST NOT emit on every sweep; that floods the EventBus.

`health` is advisory for the UI and for the Scheduler's placement decisions. It MUST NOT gate operations. The Part 03 matrix gates operations. A `degraded` Worker is still a fully permitted Worker.

# Failure Causes

```ts
type WorkerFailureCause =
  | "process_start_failed"
  | "handshake_failed"
  | "handshake_timeout"
  | "heartbeat_lost"
  | "work_deadline_exceeded"
  | "wait_deadline_exceeded"
  | "model_call_failed"
  | "tool_call_failed"
  | "budget_exhausted"
  | "permission_revoked"
  | "sandbox_violation"
  | "corrupt_lifecycle_record"
  | "pause_queue_overflow"
  | "parent_terminated"
  | "process_crashed"
  | "unknown";

type WorkerFailureRecord = {
  workerId: string;
  cause: WorkerFailureCause;
  detail: string;
  stateAtFailure: WorkerState;
  transitionSeqAtFailure: number;
  processExitCode?: number;
  processSignal?: string;
  lastOutputTail?: string;
  detectedBy: RuntimeActorRef;
  at: string;
};
```

`lastOutputTail` MUST be capped at 8192 bytes and MUST be scrubbed of secrets before persistence per [[WorkerSandbox-Part05]].

Every transition into `failing` MUST write exactly one `WorkerFailureRecord`. A `failing` Worker with no failure record is a corrupt record, and Part 05's recovery treats it as such.

# Invariants

```text
Every stallable state has a non-null stateDeadlineAt.
Every non-stallable state has a null stateDeadlineAt.
blocked and paused are never stallable.
A heartbeat never resets a deadline.
A heartbeat never causes a transition.
emit_progress never resets a deadline.
health never gates an operation.
The watchdog uses the public transition function only.
Every failing state has exactly one WorkerFailureRecord.
```

# AI Notes

Do not implement one `setTimeout` per Worker per state. With fifty Workers you get hundreds of live timers that leak on every transition and drift on system sleep. One 5-second sweep over a `stateDeadlineAt` column is correct, simple, and survives the laptop lid closing.

Do not let a heartbeat reset the `working` deadline. It is the single most tempting mistake in this document and it defeats the entire stall-detection design. Heartbeats prove the process is alive. Deadlines prove the work is finite. Different questions.

Do not treat `degraded` as a reason to stop giving a Worker operations. Degraded means slow, not broken.

Do not use wall-clock differences for deadlines without accounting for system sleep. When the machine wakes, thousands of milliseconds have passed and every deadline fires at once. The sweep handles this correctly by design: it processes them in `workerId` order and each goes through the normal transition function. Do not "fix" this by suppressing the burst.

# Related Documents

- [[WorkerLifecycle-Part03]]
- [[WorkerLifecycle-Part05]]
- [[WorkerLifecycle-Diagrams]]
- [[WorkerMonitoring-Part01]]
- [[WorkerMetrics-Part01]]
- [[Scheduler-Part05]]
</content>
