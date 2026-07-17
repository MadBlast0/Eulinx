---
title: WorkerCommunication Diagrams
status: draft
version: 1.0
tags:
  - worker-system
  - worker-communication
  - diagrams
related:
  - "[[WorkerCommunication-Part01]]"
  - "[[WorkerCommunication-Part08]]"
---

# WorkerCommunication Diagrams

## Runtime-Routed Communication

```mermaid
flowchart TD
  A["Worker A"] --> R["Runtime Router"]
  R --> P["Permission Check"]
  P --> C["Context/Artifact Filter"]
  C --> B["Worker B or Parent"]
```

## Parent-Child Reporting

```mermaid
sequenceDiagram
  participant C as Child Worker
  participant R as Runtime
  participant A as ArtifactManager
  participant P as Parent Orchestrator

  C->>A: create artifact
  C->>R: report completion
  R->>P: deliver artifact reference
  P->>R: update task state
```

## Backpressure Flow

```mermaid
flowchart TD
  A["Message Stream"] --> B["Priority Classifier"]
  B --> C["Rate Limit"]
  C --> D["Summarize"]
  D --> E["Deliver Useful Update"]
```

## ASCII Overview

```text
Worker message
  -> validate envelope
  -> check channel
  -> check permission
  -> redact if needed
  -> route
  -> acknowledge
  -> persist for replay
```

# Related Documents

- [[WorkerCommunication-Part01]]
- [[WorkerCommunication-Part08]]

