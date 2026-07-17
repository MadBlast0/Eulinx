---
title: WorkerLifecycle Specification - Part 05
status: draft
version: 1.0
tags:
  - worker-system
  - worker-lifecycle
  - recovery
related:
  - "[[WorkerLifecycle-Part04]]"
  - "[[WorkerLifecycle-Part06]]"
  - "[[ProcessLifecycle-Part01]]"
---

# WorkerLifecycle Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, States, and Object Model
Part 02 - Legal Transitions, Triggers, and Illegal Transitions
Part 03 - Per-State Allowed Operations and the Operation Gate
Part 04 - Timeouts, Heartbeats, and Health
Part 05 - Crash, Recovery, and Persistence Across Restart
Part 06 - Implementation Checklist, Examples, and Future Expansion

# Purpose

This part defines what happens when things die: the Worker process, the runtime, or the whole app.

Eulinx is a desktop app. It will be force-quit, it will be killed by the OS updater, and the machine will lose power mid-task. A Worker system that assumes a clean shutdown is a Worker system that leaks processes onto the user's machine and loses their work.

The governing rule:

```text
A Worker's state is whatever SQLite says it is.
In-memory state is a cache of SQLite, never the reverse.
On restart, memory is rebuilt from SQLite. SQLite is never rebuilt from memory.
```

# Persistence Schema

```sql
CREATE TABLE worker_lifecycle (
  workerId          TEXT PRIMARY KEY,
  workspaceId       TEXT NOT NULL,
  sessionId         TEXT NOT NULL,
  state             TEXT NOT NULL,
  previousState     TEXT,
  resumeState       TEXT,
  stateEnteredAt    TEXT NOT NULL,
  stateDeadlineAt   TEXT,
  transitionSeq     INTEGER NOT NULL DEFAULT 0,
  lastHeartbeatAt   TEXT,
  missedHeartbeats  INTEGER NOT NULL DEFAULT 0,
  health            TEXT NOT NULL DEFAULT 'unknown',
  terminationReason TEXT,
  failureCause      TEXT,
  processId         TEXT,
  osPid             INTEGER,
  terminalId        TEXT,
  restartGeneration INTEGER NOT NULL DEFAULT 0,
  createdAt         TEXT NOT NULL,
  updatedAt         TEXT NOT NULL
);

CREATE INDEX idx_worker_lifecycle_deadline
  ON worker_lifecycle (stateDeadlineAt)
  WHERE stateDeadlineAt IS NOT NULL;

CREATE INDEX idx_worker_lifecycle_live
  ON worker_lifecycle (state, workspaceId);

CREATE TABLE worker_transitions (
  workerId  TEXT NOT NULL,
  seq       INTEGER NOT NULL,
  fromState TEXT NOT NULL,
  toState   TEXT NOT NULL,
  trigger   TEXT NOT NULL,
  actorKind TEXT NOT NULL,
  actorId   TEXT,
  reason    TEXT NOT NULL,
  at        TEXT NOT NULL,
  PRIMARY KEY (workerId, seq)
);
```

`osPid` is stored alongside `processId` specifically so that recovery can look for escaped processes after a crash. `processId` is Eulinx's handle; `osPid` is the number the operating system knows.

The `worker_transitions` table is append-only. It MUST NOT be updated or deleted from during normal operation. It is the Replay record required by the global runtime principles.

# Crash Taxonomy

Three different things can die, and they need three different responses.

```text
KIND               WHAT DIED              DETECTED BY
------------------------------------------------------------------
worker_crash       The Worker process     ProcessLifecycle exit event
                                          or heartbeat loss
runtime_crash      A runtime service      RuntimeManager health check
app_crash          The whole Eulinx app      Next startup finds live
                                          states in SQLite
```

# Worker Crash

A Worker crash is the Worker's OS process exiting without the runtime asking it to.

Detection is by whichever fires first:

1. ProcessLifecycle emits `process.exited` with an unexpected exit for a Worker not in `terminating`.
2. The health sweep hits `missedHeartbeats >= 6` per Part 04.

The response is identical for both:

1. Fire `fatal_error` with cause `process_crashed` or `heartbeat_lost`.
2. The Worker enters `failing`. Its `WorkerFailureRecord` captures the exit code, signal, and output tail.
3. `failing` entry side effects run: flush artifacts, capture cause.
4. `cleanup_done` fires. The Worker enters `terminating`.
5. The death procedure in [[WorkerTermination-Part02]] runs: release locks, flush memory, cascade to children, tear down the terminal.
6. The Worker enters `terminated`.

A crashed Worker MUST NOT be restarted in place. There is no transition from `failing` back to any Live state, and this is deliberate. A Worker's identity is bound to its process, its context package, and its sandbox at creation. Reusing the record would produce a Worker whose transition history describes a process that no longer exists.

Recovery from a crash means **creating a new Worker** with a new ID, a fresh context package assembled from the dead Worker's flushed artifacts and memory, and a `retryOf` pointer to the dead Worker. That is WorkerCreation's job, driven by the Scheduler's retry policy. See [[WorkerCreation-Part05]].

# App Restart Recovery

This is the important one, because it runs on a database that was written by a process that no longer exists.

On startup, before any Worker may be created, the RuntimeManager MUST run recovery to completion.

## The Recovery Algorithm

1. `SELECT * FROM worker_lifecycle WHERE state NOT IN ('terminated')`. These are the survivors. Every one of them is lying about being alive.
2. For each survivor, in `workerId` order:
3. Increment `restartGeneration`. Any heartbeat from the old generation is now rejected per Part 04.
4. Set `health = "unknown"`. No heartbeat has been seen this generation.
5. Dispatch on the persisted state per the recovery table below.
6. Write the recovery outcome as a normal transition, with actor `RecoveryEngine` and reason `app_restart`.
7. After all survivors are handled, run the escaped-process sweep.
8. Only then, mark the runtime `ready` and allow Worker creation.

Step 8 is a hard ordering requirement. Creating a Worker before recovery finishes means the new Worker can contend for a lock that a ghost still holds in the database.

## The Recovery Table

```text
PERSISTED STATE  RECOVERY ACTION
------------------------------------------------------------------
requested        Re-admit. Nothing was allocated, so nothing leaked.
                 Fire admit. If admission now rejects, terminate.
queued           Re-enqueue with the Scheduler. Preserve the original
                 createdAt so queue fairness is not reset by a restart.
spawning         The process may or may not exist. Look up osPid.
                 Fire fatal_error, cause process_crashed, then let
                 the escaped-process sweep handle the orphan.
initializing     Same as spawning. A half-initialized Worker is not
                 recoverable because the handshake carried state that
                 lived only in the dead runtime's memory.
idle             Fire fatal_error, cause process_crashed. The process
                 is gone; only its record survived.
working          Fire fatal_error, cause process_crashed. The in-flight
                 task is disposed per WorkerTermination-Part03.
waiting          Fire fatal_error, cause process_crashed. The awaited
                 response can never arrive; the awaiter is dead.
blocked          Fire fatal_error, cause process_crashed. Release the
                 gate it was blocked on so other Workers can proceed.
paused           Fire fatal_error, cause process_crashed. A paused
                 Worker's frozen PTY did not survive the restart.
failing          Resume the death procedure. Fire cleanup_done.
terminating      Resume the death procedure. Re-run it from the start;
                 it is idempotent by requirement.
zombie           Hand to the escaped-process sweep.
terminated       Not selected. Already sealed.
```

The pattern is blunt and intentional: **no Live state survives an app restart**. Every Worker with a process dies, because its process is already gone. Eulinx does not attempt to re-attach to orphaned CLI processes. Attaching to a process whose PTY buffer, model conversation, and tool state all lived in the dead runtime's memory would produce a Worker that appears alive but cannot be reasoned about.

The user's work is not lost, because artifacts were flushed and memory was written as the Worker went. The Worker is lost. That is an acceptable and honest trade.

# The Escaped-Process Sweep

An escaped process is an OS process that Eulinx started and no longer tracks. After a hard crash there may be several.

1. `SELECT workerId, osPid FROM worker_lifecycle WHERE osPid IS NOT NULL AND state IN ('terminated', 'zombie')`.
2. For each `osPid`, ask the OS whether the process exists.
3. If it does not exist, clear `osPid` and continue. Clean.
4. If it exists, verify it is actually ours before touching it. Check that the process command line contains the Worker's sandbox root path. A PID is reused by the OS; killing a PID without verifying identity kills an unrelated program on the user's machine.
5. If verification fails, clear `osPid`, log `pid_reused`, and continue. MUST NOT kill it.
6. If verification succeeds, this is a genuine escapee. Transition the Worker to `zombie` if not already, and hand it to the ZombieReaper per [[WorkerTermination-Part04]].

Step 4 is a safety requirement, not an optimization. Skipping it means Eulinx kills a random process on the user's computer after a crash.

# Recovery Events

```ts
type WorkerRecoveryEvent = {
  type: "worker.recovered";
  workerId: string;
  workspaceId: string;
  restartGeneration: number;
  stateBeforeRestart: WorkerState;
  stateAfterRecovery: WorkerState;
  osPidFound: boolean;
  at: string;
};
```

The UI MUST surface recovered Workers to the user as a distinct list on restart. A user who force-quit Eulinx mid-task needs to see what died, not discover it later.

# Invariants

```text
SQLite is the source of truth for Worker state.
Recovery runs to completion before any Worker is created.
Recovery never reattaches to an orphaned process.
Every survivor gets restartGeneration incremented.
Every survivor gets health set to unknown.
A pre-crash generation heartbeat is always rejected.
No osPid is killed without command-line verification.
The death procedure is idempotent and safe to re-run.
worker_transitions is append-only.
```

# AI Notes

Do not try to reattach to a running CLI process after a restart. It is the first idea every implementer has and it is wrong. The process is a PTY with a conversation in its memory and a model connection in flight. The runtime that understood all of that is gone. What you would recover is a terminal that echoes text at a Worker record that cannot interpret it.

Do not skip the `restartGeneration` bump. Without it, a stale process from before the crash sends a heartbeat, the runtime accepts it, and a Worker the database has marked dead appears healthy forever.

Do not kill by PID without verifying the command line. PIDs are recycled aggressively on Windows. This is the one bug in this document that damages things outside Eulinx.

Do not run recovery lazily "when the workspace is opened". Escaped processes are burning the user's CPU and tokens right now, at startup, before any workspace is opened.

Do not delete rows from `worker_transitions` to save space. That is the Replay record. If it grows, archive it; never truncate it.

# Related Documents

- [[WorkerLifecycle-Part04]]
- [[WorkerLifecycle-Part06]]
- [[WorkerLifecycle-Diagrams]]
- [[WorkerTermination-Part02]]
- [[WorkerTermination-Part04]]
- [[WorkerCreation-Part05]]
- [[ProcessLifecycle-Part01]]
- [[RuntimeManager-Part05]]
</content>
