---
title: CodingStandards Diagrams
status: draft
version: 1.0
tags: [development, diagrams]
related:
  - "[[CodingStandards-Part01]]"
---

# CodingStandards Diagrams

```mermaid
flowchart LR
  Code["Source change"] --> Lint["ESLint"]
  Code --> Format["Prettier check"]
  Code --> TC["tsc --noEmit (strict)"]
  Lint --> Gate["Pre-commit / CI gate"]
  Format --> Gate
  TC --> Gate
  Gate -->|fail| Fix["Fix root cause (no disable)"]
  Gate -->|pass| Merge["Merge allowed"]
```

```text
Enforcement chain
==================
edit ─▶ eslint ─┐
edit ─▶ prettier├─▶ gate ─▶ pass? merge : fix
edit ─▶ tsc     ─┘

Rust side
=========
edit ─▶ cargo fmt ─▶ cargo clippy ─▶ cargo check
(all in src-tauri, minimal surface)
```

# Layer Ownership (text)

```text
UI layer      : presentational only, Tailwind + tokens, no invoke
Services layer: ONLY invoke gateway, typed DTOs
Rust layer    : thin bridge, typed serde commands, no business logic
```

# Related Documents

- [[CodingStandards-Part01]]
- [[ArchitectureRules-Part01]]
