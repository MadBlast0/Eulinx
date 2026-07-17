---
title: LoopNodes Diagrams
status: draft
version: 1.0
tags:
  - workflow-engine
  - loop-nodes
  - diagrams
related:
  - "[[06-workflow-engine/README]]"
  - "[[LoopNodes-Part01]]"
  - "[[LoopNodes-Part06]]
---

# LoopNodes Diagrams

## The Four Loop Kinds

```mermaid
flowchart TD
  L["Loop"] --> FE["for-each (collection)"]
  L --> WH["while (condition + ceiling)"]
  L --> RF["refine (done predicate + ceiling)"]
  L --> BD["bounded (count ceiling)"]
```

## Refine Loop (Builder -> Verifier)

```mermaid
flowchart TD
  START["iteration i"] --> B["Builder (read-only)"]
  B --> AR["artifactRef"]
  AR --> V["Verifier"]
  V --> P{"passed?"}
  P -->|"yes"| BRK["break -> emit final artifactRef"]
  P -->|"no"| CONT["continue -> next iteration"]
  CONT --> START
  BRK --> DONE["loop succeeded"]
```

## Termination Guarantee

```text
every loop has maxIterations (hard ceiling)
  |
  v
exhaustion OR soft condition OR break -> terminate
exceeding ceiling -> failed: iteration_limit_exceeded
NEVER hangs
```

## Related Documents

- [[06-workflow-engine/README]]
- [[LoopNodes-Part01]]
- [[LoopNodes-Part04]]
- [[LoopNodes-Part05]]
- [[BuilderNodes-Part01]]
- [[VerifierNodes-Part01]]
