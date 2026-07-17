---
title: WorkerTesting Diagrams
status: draft
version: 1.0
tags:
  - testing
  - diagrams
related:
  - "[[WorkerTesting-Part01]]"
---

# WorkerTesting Diagrams

```mermaid
flowchart TD
  REPLAY["Recorded Replay"] --> DRIVER["Replay Driver"]
  DRIVER --> MODEL["Scripted Model Fake"]
  MODEL --> RUNTIME["Worker Runtime"]
  RUNTIME --> ART["Artifact"]
  RUNTIME --> EVT["Events"]
  RUNTIME --> STATE["Worker/Task State"]
  REPLAY --> DIFF["Expected Outcome"]
  ART --> DIFF
  EVT --> DIFF
  STATE --> DIFF
  DIFF -->|mismatch| FAIL["Test Fails"]
```

```text
Worker Test Flow
  Replay -- drives --> Model Fake -- streams --> Runtime
  Runtime -- emits --> Artifacts + Events + State
  All three -- compared to --> Expected (from Replay)
  Divergence = failure
```

# Related Documents

- [[WorkerTesting-Part01]]
- [[04-memory/Replay/Replay-Part01]]
