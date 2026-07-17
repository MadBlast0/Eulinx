---
title: ModelProfiles Diagrams
status: draft
version: 1.0
tags:
  - ai-system
  - model-profiles
  - diagrams
related:
  - "[[ModelProfiles-Part01]]"
---

# ModelProfiles Diagrams

## Resolution

```mermaid
flowchart TD
  REQ["Role requests: cheap + coding"] --> RES["Resolver"]
  RES --> P1["Profile A (cheap coder)"]
  RES --> P2["Profile B (strong coder)"]
  RES --> FALL["Fallback chain"]
  P1 --> CALL["Model call"]
  FALL --> CALL
```

```text
request capability -> resolver -> best match -> call
primary fails -> fallback chain -> call
```

## Capability Tags

```text
coding, reasoning, planning, writing,
vision, fast, cheap, offline
```

# Related Documents

- [[ModelProfiles-Part01]]
- [[CostOptimization-Part03]]
