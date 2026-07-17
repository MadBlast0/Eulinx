---
title: WorkerLifecycle Specification - Part 03
status: draft
version: 1.0
tags:
  - worker-system
  - worker-lifecycle
  - operations
related:
  - "[[WorkerLifecycle-Part02]]"
  - "[[WorkerLifecycle-Part04]]"
  - "[[PermissionManager-Part01]]"
---

# WorkerLifecycle Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, States, and Object Model
Part 02 - Legal Transitions, Triggers, and Illegal Transitions
Part 03 - Per-State Allowed Operations and the Operation Gate
Part 04 - Timeouts, Heartbeats, and Health
Part 05 - Crash, Recovery, and Persistence Across Restart
Part 06 - Implementation Checklist, Examples, and Future Expansion

# Purpose

This part defines what a Worker is allowed to do in each state, and the gate that enforces it.

The state machine is worthless if a Worker in `paused` can still call a tool. The operation gate is what makes the state machine load-bearing rather than decorative.

# Core Principle

State is checked before permission, not after.

```text
Operation arrives
  |
  v
Operation Gate      <-- "is this legal in this state?"
  |
  v
PermissionManager   <-- "is this Worker allowed to do this at all?"
  |
  v
Execute
```

A `paused` Worker with full filesystem permission MUST NOT write a file. The permission is irrelevant because the gate rejected it first. This ordering MUST NOT be reversed, because reversing it means a paused Worker's writes are only stopped by luck.

# Operation Enum

```ts
type WorkerOperation =
  | "accept_task"
  | "call_model"
  | "invoke_tool"
  | "read_file"
  | "write_artifact"
  | "acquire_lock"
  | "release_lock"
  | "spawn_child"
  | "send_message"
  | "receive_message"
  | "write_memory"
  | "read_memory"
  | "request_permission"
  | "emit_progress"
  | "heartbeat"
  | "accept_terminate";
```

# The Operation Matrix

This matrix is normative. `Y` means permitted, `N` means rejected by the gate.

```text
                 req que spw ini idl wrk wai blk pau fai trm end zom
accept_task       N   N   N   N   Y   N   N   N   N   N   N   N   N
call_model        N   N   N   N   N   Y   N   N   N   N   N   N   N
invoke_tool       N   N   N   N   N   Y   N   N   N   N   N   N   N
read_file         N   N   N   N   N   Y   N   N   N   N   N   N   N
write_artifact    N   N   N   N   N   Y   N   N   N   Y   Y   N   N
acquire_lock      N   N   N   N   N   Y   N   N   N   N   N   N   N
release_lock      N   N   N   N   Y   Y   Y   Y   Y   Y   Y   N   N
spawn_child       N   N   N   N   N   Y   N   N   N   N   N   N   N
send_message      N   N   N   N   Y   Y   Y   Y   N   N   N   N   N
receive_message   N   N   N   Y   Y   Y   Y   Y   N   N   N   N   N
write_memory      N   N   N   N   Y   Y   N   N   N   Y   Y   N   N
read_memory       N   N   N   Y   Y   Y   Y   Y   N   N   N   N   N
request_permission N  N   N   N   N   Y   N   Y   N   N   N   N   N
emit_progress     N   N   N   Y   Y   Y   Y   Y   N   N   N   N   N
heartbeat         N   N   N   Y   Y   Y   Y   Y   Y   Y   Y   N   N
accept_terminate  N   N   N   Y   Y   Y   Y   Y   Y   Y   Y   N   N
```

Column keys: req=requested, que=queued, spw=spawning, ini=initializing, idl=idle, wrk=working, wai=waiting, blk=blocked, pau=paused, fai=failing, trm=terminating, end=terminated, zom=zombie.

# Reading the Matrix: The Non-Obvious Rows

`write_artifact` is permitted in `failing` and `terminating`. This is deliberate. A Worker that is dying MUST be able to flush the artifact it was midway through producing, or work is silently lost. See [[WorkerTermination-Part03]] for the flush procedure.

`release_lock` is permitted in every Live state plus `failing` and `terminating`, and nowhere else. A Worker MUST be able to give a lock back no matter how badly it is doing. It MUST NOT be able to acquire one while dying.

`heartbeat` is permitted in every state that has a process except `zombie`. A zombie's heartbeat MUST be rejected, because a zombie's record is dead and accepting its heartbeat would resurrect a Worker that the runtime has already accounted for as gone.

`request_permission` is permitted in `working` and `blocked`. `blocked` is included because the canonical way out of a permission block is to request the escalation that unblocks it.

`send_message` is denied in `paused`. A paused Worker is frozen, and a frozen Worker that can still talk is not frozen.

`accept_terminate` is `Y` everywhere a process exists. Termination is never refusable. A Worker MUST NOT be able to decline its own death.

# The Operation Gate

```ts
type GateResult =
  | { allowed: true }
  | { allowed: false; error: GateError };

type GateError = {
  kind: "operation_not_allowed_in_state";
  workerId: string;
  operation: WorkerOperation;
  state: WorkerState;
  message: string;
  retryable: boolean;
};

function gate(
  state: WorkerState,
  operation: WorkerOperation
): GateResult;
```

`gate` MUST be a pure function. It MUST NOT read the database, call a service, or emit an event. It is a matrix lookup and nothing else. This is what makes it exhaustively testable: 13 states times 16 operations is 208 assertions, and all 208 MUST be tested.

`retryable` is computed from the state, not the operation:

```text
retryable = true   when state is queued, spawning, initializing,
                   waiting, blocked, or paused
retryable = false  when state is requested, failing, terminating,
                   terminated, or zombie
```

A `retryable: true` rejection means "not now, ask again later". A `retryable: false` rejection means "never again, stop asking". A caller that retries a non-retryable rejection is a bug.

# The Gate Algorithm

1. Receive `(workerId, operation)`.
2. `SELECT state FROM worker_lifecycle WHERE workerId = ?`.
3. If no row, return `{ allowed: false, kind: "operation_not_allowed_in_state", state: "terminated" }`. A Worker that does not exist is treated as terminated, never as permitted.
4. Look up `matrix[state][operation]`.
5. If `N`, compute `retryable` from the state and return `{ allowed: false }`.
6. If `Y`, return `{ allowed: true }`.
7. MUST NOT cache the result. State changes between calls, and a cached `allowed: true` is a paused Worker that keeps writing.

Step 7 is not an optimization note. It is a correctness requirement.

# Entry Side Effects

Each state has entry side effects that run after the transition commits, per Part 02 step 18. They MUST be idempotent, because recovery re-runs them.

```text
STATE          ENTRY SIDE EFFECTS
------------------------------------------------------------------
queued          Register with Scheduler queue.
spawning        Reserve the sandbox root. Reserve the terminal slot.
initializing    Start the handshake timer. Open the event stream.
idle            Clear the current task binding. Reset the stall counter.
working         Bind the task. Start the work deadline timer.
waiting         Record what is awaited in awaitedRef. Start the wait timer.
blocked         Record the gate in blockedBy. Notify the UI. No timer.
paused          Freeze the PTY. Snapshot the pending operation queue.
failing         Stop accepting new operations. Capture the failure cause.
terminating     Run the death procedure per WorkerTermination-Part02.
terminated      Seal the post-mortem record. Release the terminal slot.
zombie          Register with the ZombieReaper. Alert the UI.
```

`requested` has no entry side effects. It is a record and nothing more.

# Exit Side Effects

```text
STATE          EXIT SIDE EFFECTS
------------------------------------------------------------------
queued          Remove from the Scheduler queue.
initializing    Cancel the handshake timer.
working         Cancel the work deadline timer. Unbind the task.
waiting         Cancel the wait timer. Clear awaitedRef.
blocked         Clear blockedBy.
paused          Unfreeze the PTY. Replay the pending operation queue.
```

States not listed have no exit side effects.

The `paused` exit is the subtle one. Operations that arrived while paused were queued, not rejected, if and only if they were `receive_message`. Everything else was rejected outright by the gate. On resume, the queued messages replay in arrival order. The queue MUST have a bounded size of 256; beyond that, the Worker transitions to `failing` with cause `pause_queue_overflow`.

# Invariants

```text
The gate is consulted before every operation, with no exceptions.
The gate is consulted before the PermissionManager, never after.
The gate result is never cached across operations.
An operation denied by the gate never reaches a runtime service.
Entry and exit side effects are idempotent.
A Worker cannot refuse accept_terminate in any state.
```

# AI Notes

Do not put the gate check inside each runtime service. It goes in one place, at the Worker's operation entry point, and every service trusts it. Scattering the check guarantees one service forgets.

Do not implement the matrix as a series of `if (state === "paused" && ...)` checks. Write the literal table. All 208 cells. It is fifteen minutes of typing and it eliminates an entire class of bug.

Do not "helpfully" allow `call_model` in `waiting`. A Worker in `waiting` already has a model call in flight. Allowing a second one is how you get two responses racing into one Worker and a corrupted conversation.

Do not skip the `zombie` column because zombies are rare. Rare paths are exactly where unchecked operations do their damage.

# Related Documents

- [[WorkerLifecycle-Part02]]
- [[WorkerLifecycle-Part04]]
- [[WorkerLifecycle-Diagrams]]
- [[WorkerTermination-Part03]]
- [[PermissionManager-Part01]]
- [[LockManager-Part01]]
</content>
