---
title: CodingRules Diagrams
status: draft
version: 1.0
tags: [ai-context, diagrams]
related: ["[[CodingRules-Part01]]"]
---

# CodingRules Diagrams

```mermaid
flowchart TD
  START["Coding task"] --> S1["Rule 1: split into small<br/>verifiable tasks"]
  S1 --> S2["Rule 2: never merge layers<br/>UI->Services->IPC->Rust"]
  S2 --> S3["Rule 3: fail closed<br/>deny on uncertainty"]
  S3 --> S4["Rule 4: respect AI/runtime boundary"]
  S4 --> S5["Rule 5/6: ~95% TS, Rust native only"]
  S5 --> S6["Rule 7: prose-only specs"]
  S6 --> S7["Rule 8: strict TS, lint, format"]
  S7 --> S8["Rule 9: UI reflects state"]
  S8 --> S9["Rule 10: invoke via service"]
  S9 --> S10["Rule 11: listen + unlisten"]
  S10 --> S11["Rule 12: events = facts"]
  S11 --> S12["Rule 13: test TS logic"]
  S12 --> S13["Rule 14: docs in sync"]
  S13 --> S14["Rule 15: git hygiene / no keys"]
  S14 --> S15["Rule 16: naming/structure"]
  S15 --> OK["Submit"]
```

```text
CODING RULES FLOW  (each rule = a gate)

PART 01  tasks & layering
  R1 small verifiable tasks
  R2 no merged layers : UI -> Services(TS) -> IPC -> Rust(thin)
  R3 fail closed       : deny on uncertain permission/lock/budget
  R4 AI/runtime boundary : runtime deterministic, no LLM

PART 02  language & docs
  R5 ~95% TypeScript
  R6 Rust = native OS only (PTY/fs/window/secure-store/dialogs)
  R7 specs prose-only, no fenced code
  R8 strict TS + ESLint + Prettier + absolute imports

PART 03  state & events
  R9  UI reflects state (Zustand + TanStack Query)
  R10 invoke only via a service
  R11 every listen has an unlisten
  R12 events = facts; invoke = commands

PART 04  quality
  R13 unit/integration tests for services/stores/utils
  R14 keep vault docs in sync with behavior
  R15 small commits, never secrets/keys
  R16 feature folders, centralized shared types
```

# Related Documents

- [[CodingRules-Part01]]
- [[06-workflow-engine/README]]
- [[07-ui-ux/README]]
- [[04-memory/README]]
- [[12-development/README]]
