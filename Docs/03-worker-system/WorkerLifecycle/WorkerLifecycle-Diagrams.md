---
title: WorkerLifecycle Diagrams
status: draft
version: 1.0
tags:
  - worker-system
  - worker-lifecycle
  - diagrams
related:
  - "[[WorkerLifecycle-Part01]]"
  - "[[WorkerLifecycle-Part02]]"
---

# WorkerLifecycle Diagrams

## Full State Machine

### High-Level Overview

```text
born -> queued -> started -> alive -> dying -> dead
```

### Detailed Mermaid

```mermaid
stateDiagram-v2
  [*] --> requested
  requested --> queued: admit
  requested --> terminated: admission_rejected
  requested --> terminated: cancel
  queued --> spawning: schedule_grant
  queued --> terminated: cancel
  spawning --> initializing: process_started
  spawning --> failing: process_start_failed
  spawning --> failing: deadline_exceeded
  initializing --> idle: handshake_ok
  initializing --> failing: handshake_failed
  idle --> working: task_assigned
  idle --> paused: pause
  idle --> terminating: terminate
  idle --> terminating: deadline_exceeded
  working --> waiting: await_external
  working --> blocked: gate_hit
  working --> idle: task_completed
  working --> paused: pause
  working --> failing: fatal_error
  working --> failing: deadline_exceeded
  working --> terminating: terminate
  waiting --> working: external_returned
  waiting --> blocked: gate_hit
  waiting --> failing: deadline_exceeded
  waiting --> terminating: terminate
  blocked --> working: gate_released
  blocked --> failing: fatal_error
  blocked --> terminating: terminate
  paused --> idle: resume
  paused --> working: resume
  paused --> terminating: terminate
  failing --> terminating: cleanup_done
  terminating --> terminated: cleanup_done
  terminating --> zombie: process_unkillable
  zombie --> terminated: reaped
  terminated --> [*]
```

### ASCII

```text
  requested
    |  admit
    v
  queued
    |  schedule_grant
    v
  spawning ---------- process_start_failed ---+
    |  process_started                        |
    v                                         |
  initializing ------ handshake_failed -------+
    |  handshake_ok                           |
    v                                         |
  +-------------------------------------+     |
  |  LIVE                               |     |
  |                                     |     |
  |   idle <---- task_completed ----+   |     |
  |    |  task_assigned             |   |     |
  |    v                            |   |     |
  |   working ----------------------+   |     |
  |    |    ^        |                  |     |
  |    |    |        | gate_hit         |     |
  |    |    |        v                  |     |
  |    |    |     blocked               |     |
  |    |    |        |  gate_released   |     |
  |    |    +--------+                  |     |
  |    |                                |     |
  |    | await_external                 |     |
  |    v                                |     |
  |   waiting -- external_returned -->  |     |
  |                                     |     |
  |   paused  (from idle or working)    |     |
  |    |  resume -> resumeState         |     |
  +-------------------------------------+     |
    |  fatal_error / deadline_exceeded        |
    v                                         |
  failing <----------------------------------+
    |  cleanup_done
    v
  terminating ------ process_unkillable ---> zombie
    |  cleanup_done                            |
    v                                          | reaped
  terminated <---------------------------------+
```

### Sequence

```mermaid
sequenceDiagram
  participant U as "User"
  participant SCH as "Scheduler"
  participant LE as "LifecycleEngine"
  participant DB as "SQLite"
  participant EB as "EventBus"
  participant W as "Worker Process"

  U->>LE: create request
  LE->>DB: insert requested
  LE->>EB: worker.state_changed
  LE->>SCH: admit
  SCH->>LE: schedule_grant
  LE->>DB: spawning
  LE->>W: start process
  W-->>LE: process_started
  LE->>DB: initializing
  W-->>LE: handshake_ok
  LE->>DB: idle
  LE->>EB: worker.ready
  SCH->>LE: task_assigned
  LE->>DB: working
  W-->>LE: task_completed
  LE->>DB: idle
```

## Transition Write Path

### High-Level Overview

```text
trigger -> validate -> persist -> emit -> side effects
```

### Detailed Mermaid

```mermaid
flowchart TD
  A["Trigger arrives"] --> B["BEGIN IMMEDIATE"]
  B --> C["SELECT state, transitionSeq"]
  C --> D{"Worker exists?"}
  D -->|"No"| E["worker_not_found"]
  D -->|"Yes"| F{"Legal from,trigger?"}
  F -->|"No"| G["illegal_transition"]
  F -->|"Yes"| H{"Actor permitted?"}
  H -->|"No"| G
  H -->|"Yes"| I["Resolve destination"]
  I --> J["Compute deadline and resumeState"]
  J --> K["UPDATE WHERE transitionSeq = old"]
  K --> L{"Rows affected?"}
  L -->|"0"| M["state_changed_concurrently"]
  L -->|"1"| N["INSERT worker_transitions"]
  N --> O["COMMIT"]
  O --> P{"Commit ok?"}
  P -->|"No"| Q["persistence_failed"]
  P -->|"Yes"| R["Emit on EventBus"]
  R --> S["Run entry side effects"]
  S --> T["Return ok"]
```

### ASCII

```text
trigger
  |
  v
BEGIN IMMEDIATE
  |
  v
read state + transitionSeq ---- missing ----> worker_not_found
  |
  v
table lookup (from, trigger) -- absent ----> illegal_transition
  |
  v
actor check ------------------- denied ----> illegal_transition
  |
  v
UPDATE ... WHERE transitionSeq = old
  |
  +-- 0 rows ------------------------------> state_changed_concurrently
  |
  v  1 row
INSERT worker_transitions
  |
  v
COMMIT ----------------------- fails -----> persistence_failed
  |
  v  (and only here)
emit event
  |
  v
entry side effects (idempotent)
```

### Sequence

```mermaid
sequenceDiagram
  participant C as "Caller"
  participant LE as "LifecycleEngine"
  participant DB as "SQLite"
  participant EB as "EventBus"

  C->>LE: transition(id, trigger, actor)
  LE->>DB: BEGIN IMMEDIATE
  LE->>DB: SELECT state, seq
  DB-->>LE: working, 5
  LE->>LE: lookup(working, gate_hit) = blocked
  LE->>LE: verify actor
  LE->>DB: UPDATE ... WHERE seq = 5
  DB-->>LE: 1 row
  LE->>DB: INSERT transition seq 6
  LE->>DB: COMMIT
  DB-->>LE: ok
  LE->>EB: worker.state_changed
  LE->>EB: worker.blocked
  LE-->>C: ok
```

## Timeout and Health Detection

### High-Level Overview

```text
Two sweeps, never merged.
Watchdog watches deadlines and moves state.
Health sweep watches heartbeats and moves nothing.
```

### Detailed Mermaid

```mermaid
flowchart TD
  subgraph WD["Watchdog: every 5s"]
    A1["SELECT WHERE stateDeadlineAt <= now"] --> A2["For each, in workerId order"]
    A2 --> A3["Fire ON EXPIRY trigger"]
    A3 --> A4["Via public transition function"]
    A4 --> A5{"Result?"}
    A5 -->|"concurrent"| A6["Skip. Stale deadline."]
    A5 -->|"illegal"| A7["Log watchdog bug. Skip."]
    A5 -->|"ok"| A8["Next row"]
  end
  subgraph HS["Health sweep: every 10s"]
    B1["For each Worker with heartbeat allowed"] --> B2{"Heartbeat within 15s?"}
    B2 -->|"Yes"| B3["missed = 0, healthy"]
    B2 -->|"No"| B4["missed += 1"]
    B4 --> B5["Recompute health"]
    B5 --> B6{"missed >= 6?"}
    B6 -->|"Yes"| B7["Fire fatal_error"]
    B6 -->|"No"| B8["No transition"]
    B5 --> B9{"health changed?"}
    B9 -->|"Yes"| B10["Emit worker.health_changed"]
  end
```

### ASCII

```text
WATCHDOG (5s)                    HEALTH SWEEP (10s)
  |                                |
  v                                v
deadline index scan              heartbeat age check
  |                                |
  v                                v
fire ON EXPIRY trigger           missedHeartbeats += 1
  |                                |
  v                                v
STATE MOVES                      health recomputed
                                   |
                                   +-- 0      healthy
                                   +-- 1-2    degraded
                                   +-- 3-5    unresponsive
                                   +-- 6+     unresponsive + fatal_error
                                   |
                                   v
                                 STATE DOES NOT MOVE
                                 (except at 6+)

Heartbeat NEVER resets a deadline.
Progress  NEVER resets a deadline.
Health    NEVER gates an operation.
```

### Sequence

```mermaid
sequenceDiagram
  participant W as "Worker Process"
  participant HS as "Health Sweep"
  participant WD as "Watchdog"
  participant DB as "SQLite"

  W->>DB: heartbeat seq 1
  HS->>DB: age check: 2s, healthy
  W->>DB: heartbeat seq 2
  HS->>DB: age check: 3s, healthy
  Note over W: enters reasoning loop
  W->>DB: heartbeat seq 180
  HS->>DB: age check: 4s, healthy
  WD->>DB: deadline check
  DB-->>WD: working since 1800s
  WD->>DB: fire deadline_exceeded
  DB-->>WD: state = failing
  Note over W,WD: healthy the whole time. Still killed.
```

## App Restart Recovery

### High-Level Overview

```text
Nothing alive survives a restart. Only the record does.
```

### Detailed Mermaid

```mermaid
flowchart TD
  A["App starts"] --> B["SELECT state != terminated"]
  B --> C["For each survivor, workerId order"]
  C --> D["restartGeneration += 1"]
  D --> E["health = unknown"]
  E --> F{"Persisted state?"}
  F -->|"requested"| G["Re-admit"]
  F -->|"queued"| H["Re-enqueue, keep createdAt"]
  F -->|"any Live state"| I["fatal_error: process_crashed"]
  F -->|"spawning or initializing"| I
  F -->|"failing or terminating"| J["Resume death procedure"]
  F -->|"zombie"| K["Hand to reaper"]
  I --> J
  G --> L["Escaped-process sweep"]
  H --> L
  J --> L
  K --> L
  L --> M["Verify osPid command line"]
  M --> N{"Ours?"}
  N -->|"No"| O["Clear osPid. Log pid_reused. Do not kill."]
  N -->|"Yes"| P["Mark zombie. Hand to reaper."]
  O --> Q["Runtime ready"]
  P --> Q
  Q --> R["Worker creation now permitted"]
```

### ASCII

```text
startup
  |
  v
survivors = SELECT WHERE state != terminated
  |
  v
for each (workerId order):
  restartGeneration += 1      <-- stale heartbeats now rejected
  health = unknown
  |
  +-- requested     -> re-admit
  +-- queued        -> re-enqueue (preserve createdAt)
  +-- spawning      -> fatal_error: process_crashed
  +-- initializing  -> fatal_error: process_crashed
  +-- idle          -> fatal_error: process_crashed
  +-- working       -> fatal_error: process_crashed
  +-- waiting       -> fatal_error: process_crashed
  +-- blocked       -> fatal_error: process_crashed  (release gate)
  +-- paused        -> fatal_error: process_crashed
  +-- failing       -> resume death procedure
  +-- terminating   -> resume death procedure
  +-- zombie        -> reaper
  |
  v
escaped-process sweep
  |
  +-- osPid exists?  no  -> clear. clean.
  +-- osPid exists?  yes -> command line contains sandbox root?
                             no  -> clear. pid_reused. DO NOT KILL.
                             yes -> zombie. reaper.
  |
  v
runtime ready        <-- ONLY NOW may a Worker be created
```

### Sequence

```mermaid
sequenceDiagram
  participant APP as "Eulinx startup"
  participant RM as "RuntimeManager"
  participant RE as "RecoveryEngine"
  participant DB as "SQLite"
  participant OS as "Operating System"
  participant UI as "React UI"

  APP->>RM: start
  RM->>RE: recoverAllWorkers
  RE->>DB: SELECT state != terminated
  DB-->>RE: 3 survivors
  RE->>DB: bump restartGeneration
  RE->>DB: fatal_error for each Live
  RE->>DB: resume death procedures
  RE->>OS: does osPid 7742 exist?
  OS-->>RE: yes
  RE->>OS: command line for 7742?
  OS-->>RE: contains sandbox root
  RE->>DB: mark zombie
  RE-->>RM: recovery complete
  RM->>UI: worker.recovered x3
  RM->>RM: state = ready
  Note over RM: only now is creation permitted
```
</content>
