---
title: DynamicGraphs Diagrams
status: draft
version: 1.0
tags:
  - workflow-engine
  - dynamic-graphs
  - diagrams
related:
  - "[[06-workflow-engine/README]]"
  - "[[DynamicGraphs-Part01]]"
  - "[[DynamicGraphs-Part04]]"
---

# DynamicGraphs Diagrams

## Mutation Request Path

```mermaid
flowchart TD
  O["Orchestrator"] --> MR["MutationRequest"]
  MR --> V["validate (kind, config, ports)"]
  V --> AUTH["authorize (allow-list)"]
  AUTH --> BUD["budget check"]
  BUD --> CYC["cycle prevention"]
  CYC --> INV{"invalidates succeeded node?"}
  INV -->|"yes"| REJ["reject: graph_invalid"]
  INV -->|"no"| APP["apply atomically"]
  APP --> LOG["append to mutation log"]
  LOG --> EMIT["emit workflow.graph.mutated"]
  EMIT --> TICK["recompute ready set"]
```

## Subgraph Expansion

```text
before:
  A --> PLACEHOLDER --> B

mutation expands PLACEHOLDER into X -> Y -> Z:

after (atomic):
  A --> X -> Y -> Z --> B
  PLACEHOLDER removed; edges rewired
```

## Replay of Mutations

```mermaid
flowchart TD
  RUN["original run"] --> LOG["mutation log + runSeq"]
  LOG --> REPLAY["replay: apply recorded mutations in order"]
  REPLAY --> SAME["same expanded graph, same order"]
```

## Related Documents

- [[06-workflow-engine/README]]
- [[DynamicGraphs-Part01]]
- [[DynamicGraphs-Part04]]
- [[DynamicGraphs-Part05]]
- [[NodeTypes-Part02]]
- [[WorkflowEngine-Part07]]
