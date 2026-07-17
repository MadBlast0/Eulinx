---
title: ExecutionFlow Diagrams
status: draft
version: 1.0
tags:
  - workflow-engine
  - execution-flow
  - diagrams
related:
  - "[[06-workflow-engine/README]]"
  - "[[ExecutionFlow-Part01]]"
  - "[[ExecutionFlow-Part04]]"
---

# ExecutionFlow Diagrams

## End-to-End Flow

```mermaid
flowchart TD
  TRIG["run trigger"] --> INIT["init: seed RunContext"]
  INIT --> TICK["tick: ready set"]
  TICK --> ADMIT["Scheduler.admit"]
  ADMIT --> DISP["dispatch batch"]
  DISP --> EXE["ExecutionEngine"]
  EXE --> APPLY["apply results + edge satisfaction"]
  APPLY --> PROP["skip/failure propagation"]
  PROP --> TERM{"terminal?"}
  TERM -->|"no"| TICK
  TERM -->|"yes"| DONE["succeeded / failed / cancelled"]
```

## Parallel Branches and Join

```mermaid
flowchart TD
  IN["Input"] --> BA["BuilderA"]
  IN --> BB["BuilderB"]
  BA --> MERGE["Merge (wait-all)"]
  BB --> MERGE
  MERGE --> V["Verifier"]
  V --> OUT["Output"]
```

## Fan-In Collection Order

```text
BuilderA (nodeId a...) --satisfied--> collect [refA, refB]
BuilderB (nodeId b...) --satisfied-->   ordered by nodeId
                                       Merge receives [refA, refB]
```

## Related Documents

- [[06-workflow-engine/README]]
- [[ExecutionFlow-Part01]]
- [[ExecutionFlow-Part04]]
- [[ExecutionFlow-Part05]]
- [[WorkflowEngine-Part08]]
- [[Scheduler-Part01]]
