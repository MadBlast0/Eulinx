---
title: RefinementLoop Diagrams
status: draft
version: 1.0
tags:
  - ai-system
  - refinement-loop
  - diagrams
related:
  - "[[RefinementLoop-Part01]]"
---

# RefinementLoop Diagrams

## Loop Flow

```mermaid
flowchart TD
  START["Task + Context"] --> B["Builder: draft"]
  B --> V["Verifier: checks"]
  V --> C["Critic: feedback"]
  C --> J["Judge: accept?"]
  J -->|reject| B
  J -->|accept| DONE["Artifact accepted"]
  J -->|cap/budget| STOP["Stop, best artifact"]
```

```text
Task -> Builder -> Verifier -> Critic -> Judge
              ^                    |
              |      reject         |
              +--------------------+
```

## Mode to Cap

```text
Low    -> 1 pass
Medium -> 2 passes
High   -> 4 passes
Ultra  -> 8 passes + strong critic
```

## Sequence

```mermaid
sequenceDiagram
  participant O as Orchestrator
  participant B as Builder
  participant V as Verifier
  participant C as Critic
  participant J as Judge
  O->>B: generate
  B->>V: artifact
  V->>C: report
  C->>J: feedback
  J-->>O: accept / reject / stop
```

# Related Documents

- [[RefinementLoop-Part01]]
- [[AIArchitecture-Part03]]
