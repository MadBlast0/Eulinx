---
title: WorkflowEngine Diagrams
status: draft
version: 1.0
tags:
  - workflow-engine
  - workflow-engine-core
  - diagrams
related:
  - "[[06-workflow-engine/README]]"
  - "[[WorkflowEngine-Part01]]"
  - "[[WorkflowEngine-Part08]]"
---

# WorkflowEngine Diagrams

## Engine Tick Loop

```mermaid
flowchart TD
  START["app start / trigger"] --> CREATE["Create WorkflowRun"]
  CREATE --> SNAP["Freeze graph snapshot"]
  SNAP --> VAL["Validate graph"]
  VAL -->|"invalid"| FAILV["state = failed: graph_invalid"]
  VAL -->|"valid"| RUN["state = running"]
  RUN --> TICK["TICK"]
  TICK --> READY["computeReadySet (counter)"]
  READY --> EMPTY{"ready empty and nothing running?"}
  EMPTY -->|"yes"| TERM["compute terminal state"]
  EMPTY -->|"no"| SORT["sort by nodeId"]
  SORT --> ADMIT["Scheduler.admit(ready)"]
  ADMIT --> DISP["conditional UPDATE to running"]
  DISP --> EXE["ExecutionEngine.execute(request)"]
  EXE --> RES["NodeResult"]
  RES --> VALR["validate result schema"]
  VALR --> CTX["write RunContext outputs"]
  CTX --> PERSIST["persist node state + runSeq"]
  PERSIST --> EMIT["emit events after commit"]
  EMIT --> TICK
  TERM --> DONE["succeeded / failed / cancelled"]
```

## ASCII Overview

```text
User Goal / Saved Workflow
  |
  v
WorkflowEngine
  |
  +-- Graph Model          (nodes, edges, adjacency, in-degree)
  +-- Ready Set            (which nodes have all deps satisfied)
  +-- RunContext           (data passed along data edges)
  +-- Tick Loop            (the numbered engine algorithm)
  |
  v
Scheduler       <-- decides how many ready nodes may run now
  |
  v
ExecutionEngine <-- actually runs one node
  |
  v
NodeResult -> apply to graph -> persist -> emit -> tick again
```

## Recovery Path

```mermaid
flowchart TD
  A["App restart"] --> R["recoverAll: scan non-terminal runs"]
  R --> D{"run state?"}
  D -->|"created/validating"| E["restart as fresh run"]
  D -->|"running"| F["reconcileRunning"]
  D -->|"pausing/paused"| G["finish transition to paused"]
  D -->|"cancelling"| H["finish transition to cancelled"]
  F --> F1{"node 'running'?"}
  F1 -->|"orphaned"| F2["rollback to ready"]
  F1 -->|"lost result"| F3["fetch or fail"]
  F1 -->|"confirmed"| F4["keep running"]
  E --> T["tick"]
  G --> T
  F2 --> T
  F3 --> T
  F4 --> T
  H --> Z["terminal: cancelled"]
```

## Related Documents

- [[06-workflow-engine/README]]
- [[WorkflowEngine-Part01]]
- [[WorkflowEngine-Part03]]
- [[WorkflowEngine-Part06]]
- [[WorkflowEngine-Part07]]
- [[WorkflowEngine-Part08]]
- [[Scheduler-Part01]]
- [[ExecutionEngine-Part01]]
