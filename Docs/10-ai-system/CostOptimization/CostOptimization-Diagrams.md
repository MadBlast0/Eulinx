---
title: CostOptimization Diagrams
status: draft
version: 1.0
tags:
  - ai-system
  - cost-optimization
  - diagrams
related:
  - "[[CostOptimization-Part01]]"
---

# CostOptimization Diagrams

## Cost Flow

```mermaid
flowchart TD
  CALL["AI Call"] --> REC["Cost Record"]
  REC --> STORE["SQLite"]
  REC --> BUD["Budget Check"]
  BUD -->|ok| RUN["Allow pass"]
  BUD -->|exhausted| STOP["Stop loop"]
  STORE --> DASH["Dashboard"]
```

```text
AI Call -> Cost Record -> (store + budget check)
budget ok   -> continue
budget low  -> stop / route cheaper
```

## Levels

```text
call -> worker -> task -> phase -> run -> workspace
```

# Related Documents

- [[CostOptimization-Part01]]
- [[RefinementLoop-Part04]]
