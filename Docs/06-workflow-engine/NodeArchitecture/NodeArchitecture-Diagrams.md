---
title: NodeArchitecture Diagrams
status: draft
version: 1.0
tags:
  - workflow-engine
  - node-architecture
  - diagrams
related:
  - "[[06-workflow-engine/README]]"
  - "[[NodeArchitecture-Part01]]"
  - "[[NodeArchitecture-Part03]]"
---

# NodeArchitecture Diagrams

## Base Node and the Dispatch Boundary

```mermaid
flowchart TD
  A["Graph snapshot"] --> B["Base Node"]
  B --> C["Identity + Kind"]
  B --> D["Config (validated)"]
  B --> E["Input Ports"]
  B --> F["Output Ports"]
  B --> G["Lifecycle State"]
  B --> H["Retry / Timeout Policy"]
  C --> R["Node Kind Registry"]
  E --> REQ["ExecutionRequest"]
  REQ --> EXE["ExecutionEngine"]
  EXE --> RES["NodeResult"]
  RES --> F
```

## Node Lifecycle State Machine

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> ready
  ready --> running
  running --> succeeded
  running --> failed
  running --> cancelled
  ready --> skipped
  pending --> skipped
  ready --> cancelled
  pending --> cancelled
  succeeded --> [*]
  failed --> [*]
  skipped --> [*]
  cancelled --> [*]
```

## ASCII: Isolation at Dispatch

```text
Node (persisted record)
  |  input ports resolved from RunContext
  v
ExecutionRequest  --->  ExecutionEngine  --->  NodeResult
  |                                                 |
  v                                                 v
no graph reference                          output ports -> RunContext
no global state read                       node marked succeeded
```

## Related Documents

- [[06-workflow-engine/README]]
- [[NodeArchitecture-Part01]]
- [[NodeArchitecture-Part03]]
- [[NodeArchitecture-Part06]]
- [[NodeTypes-Part01]]
- [[ExecutionEngine-Part01]]
