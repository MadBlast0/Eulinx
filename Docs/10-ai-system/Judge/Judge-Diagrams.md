---
title: Judge Diagrams
status: draft
version: 1.0
tags:
  - ai-system
  - judge
  - diagrams
related:
  - "[[Judge-Part01]]"
---

# Judge Diagrams

## Judge Decision

```mermaid
flowchart TD
  IN["Artifact + Report + Feedback"] --> GATE{"Objective checks pass?"}
  GATE -->|no| REJ["reject (hard gate)"]
  GATE -->|yes| SCORE["score vs criteria"]
  SCORE --> DEC{"accept?"}
  DEC -->|yes| ACC["accept -> merge"]
  DEC -->|no, under cap| REJ2["reject -> loop"]
  DEC -->|no, over cap/budget| STOP["stop -> best artifact"]
```

```text
Artifact -> objective gate -> score -> accept / reject / stop
```

# Related Documents

- [[Judge-Part01]]
- [[RefinementLoop-Part04]]
- [[Verifier-Part01]]
