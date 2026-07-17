---
title: WorkflowExamples Diagrams
status: draft
version: 1.0
tags:
  - workflow-engine
  - workflow-examples
  - diagrams
related:
  - "[[06-workflow-engine/README]]"
  - "[[WorkflowExamples-Part01]]"
  - "[[WorkflowExamples-Part03]]
---

# WorkflowExamples Diagrams

## Example 3 — Refactor Refine Loop

```mermaid
flowchart TD
  IN["Input goal"] --> LOOP["Loop refine maxIterations=5"]
  LOOP --> B["Builder (read-only)"]
  B --> V["Verifier (typecheck + ai-judge)"]
  V --> C{"passed?"}
  C -->|"no"| LOOP
  C -->|"yes"| MERGE["Merge (apply)"]
  MERGE --> OUT["Output success"]
  C -->|"ceiling"| REP["Output report (last diff)"]
```

## Example 4 — Dynamic Expansion

```mermaid
flowchart TD
  IN["Input goal"] --> O["Orchestrator (allowDynamicMutation)"]
  O --> MR["MutationRequest: expand"]
  MR --> VAL["validate + budget + authorize"]
  VAL --> GRAPH["Tool -> Builder -> Verifier -> Merge"]
  GRAPH --> OUT["Output applied feature"]
```

## Example 2 — Parallel Fan-Out and Join

```mermaid
flowchart TD
  IN["Input"] --> BA["BuilderA"]
  IN --> BB["BuilderB"]
  BA --> M["Merge wait-all"]
  BB --> M
  M --> V["Verifier"]
  V --> OUT["Output"]
```

## Related Documents

- [[06-workflow-engine/README]]
- [[WorkflowExamples-Part01]]
- [[WorkflowExamples-Part03]]
- [[WorkflowExamples-Part04]]
- [[LoopNodes-Part01]]
- [[DynamicGraphs-Part01]]
- [[BuilderNodes-Part01]]
