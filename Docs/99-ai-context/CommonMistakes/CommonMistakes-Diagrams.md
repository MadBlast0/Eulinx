---
title: CommonMistakes Diagrams
status: draft
version: 1.0
tags: [ai-context, diagrams]
related: ["[[CommonMistakes-Part01]]"]
---

# CommonMistakes Diagrams

```mermaid
flowchart LR
  subgraph P1["Part 01 - state & layering"]
    M1["Optimistic Worker state"]
    M2["Unlisten leaks"]
    M3["invoke from component"]
    M4["Logic in component/hook"]
    M5["UI as source of truth"]
  end
  subgraph P2["Part 02 - rust/theming/plugin/safety"]
    M6["Hardcoded colors/tokens"]
    M7["Trusted in-process plugin"]
    M8["Widening Rust surface"]
    M9["Worker mutates project"]
    M10["Raw chat between workers"]
    M11["Skip refinement guardrails"]
  end
  P1 -->|"forbidden"| X["DO NOT SHIP"]
  P2 -->|"forbidden"| X
```

```text
ANTI-PATTERN MAP  (all forbidden for the cheap model)

PART 01  state & layering
  M1 optimistic runtime state .... wait for EventBus truth
  M2 unlisten leaks .............. pair every listen w/ unlisten
  M3 invoke from component ....... go through a service
  M4 business logic in view ...... push to service/store
  M5 UI as source of truth ...... Zustand + TanStack Query

PART 02  rust / theming / plugin / safety
  M6 hardcoded hex/spacing ....... design tokens only
  M7 trusted in-process plugin ... isolate + permission gate
  M8 widening Rust surface ....... Rust stays native bridge
  M9 worker mutates project ...... produce Artifact, MergeManager applies
  M10 raw chat between workers ... exchange Artifacts + scoped RunContext
  M11 skip refinement guardrails . stopping rule + budget + honest UX
```

# Related Documents

- [[CommonMistakes-Part01]]
- [[06-workflow-engine/README]]
- [[07-ui-ux/README]]
- [[04-memory/README]]
- [[12-development/README]]
