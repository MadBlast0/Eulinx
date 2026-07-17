---
title: ProcessLifecycle Diagrams
status: draft
version: 1.0
tags:
  - runtime
  - process-lifecycle
  - diagrams
related:
  - "[[02-runtime/README]]"
  - "[[ProcessLifecycle-Part01]]"
  - "[[WorkerSpawner-Part04]]"
  - "[[RuntimeRules-Part01]]"
---

# ProcessLifecycle Diagrams

Same architecture, four renderings, per flow.

## Process State Machine

### 1. High-Level Overview

```text
created -> starting -> running -> stopping -> exited -> cleaned
                          |
                          +-> failed / timed_out / orphaned / quarantined
```

### 2. Detailed Mermaid

```mermaid
stateDiagram-v2
  [*] --> created
  created --> starting
  starting --> running
  starting --> failed
  starting --> timed_out
  running --> stopping
  running --> exited
  running --> failed
  running --> timed_out
  running --> orphaned
  stopping --> exited
  stopping --> failed
  orphaned --> quarantined
  orphaned --> running
  failed --> cleaned
  timed_out --> cleaned
  exited --> cleaned
  quarantined --> cleaned
  cleaned --> [*]
```

### 3. ASCII

```text
+---------+    +----------+    +---------+    +----------+    +--------+
| created |--->| starting |--->| running |--->| stopping |--->| exited |
+---------+    +----------+    +---------+    +----------+    +--------+
                    |               |              |              |
                    v               v              v              v
                 +--------+   +-----------+   +--------+     +---------+
                 | failed |   | timed_out |   | failed |     | cleaned |
                 +--------+   +-----------+   +--------+     +---------+
                                    |
                                    v
                              +----------+     +-------------+
                              | orphaned |---->| quarantined |
                              +----------+     +-------------+
```

### 4. Sequence

```mermaid
sequenceDiagram
  participant WSP as WorkerSpawner
  participant PL as ProcessLifecycle
  participant OS as Operating System
  participant EB as EventBus

  WSP->>PL: startProcess with ProcessStartRequest
  PL->>PL: state created then starting
  PL->>OS: structured launch
  OS-->>PL: osPid
  PL-->>EB: process.started
  PL->>PL: state running
  OS-->>PL: exit code
  PL->>PL: state exited then cleaned
  PL-->>EB: process.exited
```

## Start and IO Capture Flow

### 1. High-Level Overview

```mermaid
graph LR
  WSP["WorkerSpawner"] --> PL["ProcessLifecycle"]
  PL --> PTY["PTY"]
  PTY --> CLI["AI CLI Process"]
  PL --> UI["Terminal UI"]
```

### 2. Detailed Mermaid

```mermaid
flowchart TD
  REQ["ProcessStartRequest"] --> CP{"Approved commandProfileId?"}
  CP -->|"No"| DENY["Reject and emit process.denied"]
  CP -->|"Yes"| PM{"PermissionManager allows?"}
  PM -->|"No"| DENY
  PM -->|"Yes"| WSM{"WorkspaceManager boundary ok?"}
  WSM -->|"No"| DENY
  WSM -->|"Yes"| ENVC["Apply environment allowlist and redaction"]
  ENVC --> PTYQ{"needsPty?"}
  PTYQ -->|"Yes"| MKPTY["Create PTY"]
  PTYQ -->|"No"| PIPES["Create stdout and stderr pipes"]
  MKPTY --> LAUNCH["Structured launch, no shell string"]
  PIPES --> LAUNCH
  LAUNCH --> REC["Record RuntimeProcess before UI exposure"]
  REC --> MON["Monitor and capture streams"]
  MON -.-> EB["EventBus process.started"]
  MON -.-> STR["ProcessStreamEvent to Terminal UI"]
  MON -.-> REP["Replay Timeline"]
```

### 3. ASCII

```text
ProcessStartRequest
  |
  v
[ commandProfileId approved? ] --no--> reject
  |yes
  v
[ PermissionManager allows? ] --no--> reject
  |yes
  v
[ WorkspaceManager boundary ] --no--> reject
  |yes
  v
[ environment allowlist + redaction ]
  |
  v
[ needsPty ? create PTY : create pipes ]
  |
  v
[ structured launch  (executable + args[]) ]
  |
  v
[ record RuntimeProcess ] -> [ monitor ]
                               |-.-> EventBus
                               |-.-> Terminal UI
                               '-.-> Replay Timeline
```

### 4. Sequence

```mermaid
sequenceDiagram
  participant WSP as WorkerSpawner
  participant PL as ProcessLifecycle
  participant PERM as PermissionManager
  participant WSM as WorkspaceManager
  participant OS as Operating System
  participant EB as EventBus
  participant UI as Terminal UI

  WSP->>PL: startProcess request
  PL->>PERM: authorize command profile
  PERM-->>PL: allow
  PL->>WSM: validate workingDirectory
  WSM-->>PL: inside boundary
  PL->>OS: create PTY and launch
  OS-->>PL: osPid and pty handle
  PL-->>EB: process.started
  loop while running
    OS-->>PL: pty output chunk
    PL-->>UI: ProcessStreamEvent
    PL-->>EB: process.output
  end
```

## Termination Flow

### 1. High-Level Overview

```text
stop request -> graceful signal -> wait timeoutMs -> force -> kill tree -> cleanup
```

### 2. Detailed Mermaid

```mermaid
flowchart TD
  S["ProcessStopRequest"] --> M{"mode"}
  M -->|"graceful"| G["Send polite termination signal"]
  M -->|"force"| F["Force terminate"]
  M -->|"tree"| T["Terminate process group"]
  G --> W{"Exited before timeoutMs?"}
  W -->|"Yes"| C["Cleanup handles and PTY"]
  W -->|"No"| F
  F --> T
  T --> C
  C -.-> EB["EventBus process.exited"]
  C --> DONE["state cleaned"]
```

### 3. ASCII

```text
ProcessStopRequest { mode: graceful | force | tree }
  |
  v
graceful signal ---- exited within timeoutMs? --yes--> cleanup
  |                                     |no
  |                                     v
  |                              force terminate
  |                                     |
  '-------------------------------------+
                                        v
                            terminate child process tree
                                        |
                                        v
                    cleanup: pty handles, process handles,
                    temp env files, stream subscriptions
                                        |
                                     -.-> EventBus process.exited
```

### 4. Sequence

```mermaid
sequenceDiagram
  participant R as Runtime Service
  participant PL as ProcessLifecycle
  participant OS as Operating System
  participant EB as EventBus

  R->>PL: stopProcess reason and mode
  PL-->>EB: process.stopping
  PL->>OS: graceful termination
  OS-->>PL: still running after timeoutMs
  PL->>OS: force terminate
  PL->>OS: terminate child tree
  OS-->>PL: exited with code
  PL->>PL: cleanup resources
  PL-->>EB: process.exited
```

## Recovery and Quarantine Flow

### 1. High-Level Overview

```text
runtime restart -> load records -> inspect OS -> prove identity
  match -> reconnect -> resume monitoring
  no match -> orphaned -> quarantined
```

### 2. Detailed Mermaid

```mermaid
flowchart TD
  A["Runtime Restart"] --> B["Load RuntimeProcess records"]
  B --> C["Inspect live OS processes"]
  C --> D{"osPid matches record?"}
  D -->|"No"| ORPH["Mark orphaned"]
  D -->|"Yes"| E{"commandProfileId matches?"}
  E -->|"No"| ORPH
  E -->|"Yes"| F{"workspaceId and sessionId bind?"}
  F -->|"No"| ORPH
  F -->|"Yes"| G{"start time and workingDirectory match?"}
  G -->|"No"| ORPH
  G -->|"Yes"| H["Reconnect streams"]
  H --> I["Resume monitoring, state running"]
  ORPH --> Q["Quarantine, input blocked"]
  I -.-> EB["EventBus process.recovered"]
  Q -.-> EB2["EventBus process.quarantined"]
```

### 3. ASCII

```text
Runtime Restart
  |
  v
load RuntimeProcess records from SQLite
  |
  v
inspect OS processes
  |
  v
identity proof, ALL must match:
  [ ] osPid
  [ ] commandProfileId
  [ ] workspaceId + sessionId binding
  [ ] process start time
  [ ] expected workingDirectory
  |
  +-- all match --> reconnect --> resume monitoring (running)
  |
  '-- any mismatch --> orphaned --> quarantined
                                     (no user input,
                                      no runtime input)
```

### 4. Sequence

```mermaid
sequenceDiagram
  participant RM as RuntimeManager
  participant PL as ProcessLifecycle
  participant DB as SQLite
  participant OS as Operating System
  participant EB as EventBus

  RM->>PL: recoverProcesses on startup
  PL->>DB: load RuntimeProcess records
  DB-->>PL: records
  PL->>OS: inspect live processes
  OS-->>PL: pid list and metadata
  alt identity proven
    PL->>OS: reattach streams
    PL-->>EB: process.recovered
  else identity uncertain
    PL->>PL: state orphaned then quarantined
    PL-->>EB: process.quarantined
  end
```

## Related Documents

- [[ProcessLifecycle-Part01]]
- [[ProcessLifecycle-Part02]]
- [[ProcessLifecycle-Part03]]
- [[ProcessLifecycle-Part04]]
- [[ProcessLifecycle-Part05]]
- [[WorkerSpawner-Part04]]
- [[RuntimeRules-Part01]]
- [[RuntimeManager-Part01]]
- [[02-runtime/README]]
