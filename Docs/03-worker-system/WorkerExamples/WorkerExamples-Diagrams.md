---
title: WorkerExamples Diagrams
status: draft
version: 1.0
tags:
  - worker-system
  - examples
  - diagrams
related:
  - "[[WorkerExamples-Part01]]"
---

# WorkerExamples Diagrams

```mermaid
flowchart TD
  A["Root Orchestrator"] --> B["Phase Orchestrator"]
  B --> C["Backend Worker"]
  B --> D["Frontend Worker"]
  C --> E["Patch Artifact"]
  D --> F["Patch Artifact"]
  E --> G["Verifier"]
  F --> G
  G --> H["MergeManager"]
```

```text
Goal
  -> orchestrate
  -> spawn workers
  -> produce artifacts
  -> verify
  -> merge
```

# Related Documents

- [[WorkerExamples-Part01]]
- [[WorkerExamples-Part04]]

