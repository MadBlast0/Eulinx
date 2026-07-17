---
title: WorkerMetrics Diagrams
status: draft
version: 1.0
tags:
  - worker-system
  - worker-metrics
  - diagrams
related:
  - "[[WorkerMetrics-Part01]]"
---

# WorkerMetrics Diagrams

```mermaid
flowchart TD
  A["Worker Metrics"] --> B["Task Metrics"]
  B --> C["Orchestrator Metrics"]
  C --> D["Workflow Metrics"]
  D --> E["Session Metrics"]
```

```text
Worker counters
  -> aggregate
  -> threshold
  -> dashboard
  -> runtime decision
```

# Related Documents

- [[WorkerMetrics-Part01]]
- [[WorkerMetrics-Part05]]

