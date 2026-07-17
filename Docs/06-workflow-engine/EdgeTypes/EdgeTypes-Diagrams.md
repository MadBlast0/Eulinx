---
title: EdgeTypes Diagrams
status: draft
version: 1.0
tags:
  - workflow-engine
  - edge-types
  - diagrams
related:
  - "[[06-workflow-engine/README]]"
  - "[[EdgeTypes-Part01]]"
  - "[[EdgeTypes-Part06]]"
---

# EdgeTypes Diagrams

## Edge Kind Catalog

```mermaid
flowchart TD
  E["Edge"] --> C["control"]
  E --> D["data"]
  E --> COND["conditional / branch"]
  E --> ERR["error"]
  E --> LB["loop-back"]
  E --> AR["artifact"]
  E --> MEM["memory"]
  E --> EV["event"]
```

## Edge Run-Time Satisfaction

```mermaid
flowchart TD
  S["source node succeeded"] --> Q{"branch selected?"}
  Q -->|"yes"| SAT["edge = satisfied"]
  Q -->|"no (Condition)"| UNSAT["edge = unsatisfied -> target skipped"]
  S --> VOID{"source skipped/cancelled?"}
  VOID -->|"yes"| V["edge = void -> target skipped/cancelled"]
  SAT --> RES["resolver reads RunContext value"]
  RES --> TGT["deliver to target port"]
```

## ASCII: Type Lattice (subset)

```text
any
 |-- json -- text -- number -- boolean
 |-- artifact-ref (only from artifact/memory edges)
 |-- worker-handle (only from Worker)
 |-- tool-handle (only from Tool)
 |-- bytes
```

## Related Documents

- [[06-workflow-engine/README]]
- [[EdgeTypes-Part01]]
- [[EdgeTypes-Part04]]
- [[EdgeTypes-Part05]]
- [[EdgeTypes-Part06]]
- [[NodeArchitecture-Part02]]
- [[ConditionNodes-Part01]]
