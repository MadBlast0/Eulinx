---
title: AIInstructions Diagrams
status: draft
version: 1.0
tags: [development, diagrams]
related:
  - "[[AIInstructions-Part01]]"
---

# AIInstructions Diagrams

```mermaid
flowchart TD
  Human["Human defines small task"] --> Rule["Point model at CLAUDE.md + spec part"]
  Rule --> Model["DeepSeek V4 Flash implements"]
  Model --> Gate["Run lint + prettier + tsc + test"]
  Gate -->|fail| Fix["Fix root cause, no disable"]
  Gate -->|pass| Commit["Atomic Conventional Commit"]
  Commit --> PR["PR + review checklist"]
  PR -->|drift| Return["Return with rule citation"]
  PR -->|ok| Merge["Squash merge"]
```

```text
Task size guidance for cheap model
==================================
BAD : "Build the whole automation system."
GOOD: 1) schema  2) registry  3) canvas  4) connect
       5) stream 6) tests     7) refactor

Forbidden for model
===================
UI -> invoke        (use services/)
hardcoded color     (use tokens)
any in TS           (use unknown + narrow)
grow Rust surface   (thin bridge only)
disable lint to pass (fix root cause)
```

# Related Documents

- [[AIInstructions-Part01]]
- [[ArchitectureRules-Part01]]
