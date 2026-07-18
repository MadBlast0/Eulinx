---
title: PromptOptimization Diagrams
status: draft
version: 1.0
tags:
  - ai-system
  - prompt-optimization
  - diagrams
  - flow:P12-PROMPT-MANAGER
related:
  - "[[PromptOptimization-Part01]]"
---

# PromptOptimization Diagrams

## Prompt Resolution

```mermaid
flowchart TD
  ROLE["Role requests prompt id + vars"] --> RES["Resolver"]
  RES --> BASE["Base prompt (cached prefix)"]
  RES --> TPL["Template + variables"]
  BASE --> OUT["Rendered prompt"]
  TPL --> OUT
  OUT --> CALL["Model call (cache hit)"]
```

```text
role -> resolver -> base + template(vars) -> rendered prompt -> call
```

## Versioning

```text
prompt:v1  (used by run A)
prompt:v2  (used by run B, replayable)
```

# Related Documents

- [[PromptOptimization-Part01]]
- [[CostOptimization-Part02]]
