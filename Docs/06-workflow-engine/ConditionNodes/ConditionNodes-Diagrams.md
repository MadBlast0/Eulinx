---
title: ConditionNodes Diagrams
status: draft
version: 1.0
tags:
  - workflow-engine
  - condition-nodes
  - diagrams
related:
  - "[[06-workflow-engine/README]]"
  - "[[ConditionNodes-Part01]]"
  - "[[ConditionNodes-Part03]]
---

# ConditionNodes Diagrams

## Branch Selection

```mermaid
flowchart TD
  IN["resolved input ports"] --> EVAL["evaluate expression (pure)"]
  EVAL --> SEL{"selected branch?"}
  SEL -->|"true"| T["mark 'true' edge satisfied"]
  SEL -->|"false"| F["mark 'false' edge unsatisfied"]
  T --> RUN["target of true runs"]
  F --> SKIP["target of false skipped"]
```

## Multi-Way With Default

```mermaid
flowchart TD
  EVAL["evaluate"] --> M{"matches named branch?"}
  M -->|"low"| L["select low; skip mid, high"]
  M -->|"mid"| MI["select mid; skip low, high"]
  M -->|"none"| DEF["select default; skip others"]
```

## ASCII: Skipped Not Pending

```text
Condition selects B
  -> other branches: edges unsatisfied
  -> their targets: skipped (terminal, recorded)
  -> run can terminate (no node hangs in pending)
```

## Related Documents

- [[06-workflow-engine/README]]
- [[ConditionNodes-Part01]]
- [[ConditionNodes-Part02]]
- [[ConditionNodes-Part04]]
- [[EdgeTypes-Part01]]
- [[NodeArchitecture-Part05]]
