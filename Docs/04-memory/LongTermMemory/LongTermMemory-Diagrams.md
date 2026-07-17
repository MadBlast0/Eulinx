---
title: LongTermMemory Diagrams
status: draft
version: 1.0
tags: [memory, diagrams]
related:
  - "[[LongTermMemory-Part01]]"
---

# LongTermMemory Diagrams

```mermaid
flowchart TD
  A["Task/Worker Summary"] --> B["Promotion Review"]
  B --> C{"Durable?"}
  C -->|"Yes"| D["Long-Term Memory"]
  C -->|"No"| E["Discard or Keep Temporary"]
```

