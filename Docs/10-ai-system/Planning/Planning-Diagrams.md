---
title: Planning Diagrams
status: draft
version: 1.0
tags:
  - ai-system
  - planning
  - diagrams
related:
  - "[[Planning-Part01]]"
---

# Planning Diagrams

## Decomposition

```mermaid
flowchart TD
  G["User Goal"] --> R["Root Orchestrator"]
  R --> P1["Phase: Auth"]
  R --> P2["Phase: DB"]
  R --> P3["Phase: Frontend"]
  P1 --> T1["Task: Schema"]
  P1 --> T2["Task: JWT"]
  T1 --> W1["Worker"]
  T2 --> W2["Worker"]
```

```text
Goal
 -> Root
    -> Phase Auth
       -> Task Schema -> Worker
       -> Task JWT    -> Worker
```

## Dynamic Growth

```text
Worker discovers subtask
  -> requests sub-worker
  -> plan node added
  -> graph grows
```

# Related Documents

- [[Planning-Part01]]
- [[AIArchitecture-Part02]]
