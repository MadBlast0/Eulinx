---
title: WorkerMemory Diagrams
status: draft
version: 1.0
tags:
  - worker-system
  - worker-memory
  - diagrams
related:
  - "[[WorkerMemory-Part01]]"
---

# WorkerMemory Diagrams

```mermaid
flowchart TD
  A["Worker Observes"] --> B["Working Memory"]
  B --> C["Task Summary"]
  C --> D["Handoff Package"]
  C --> E["MemoryManager"]
  E --> F["Future Context Package"]
```

```text
Worker Memory
  -> summarize
  -> redact
  -> promote if useful
  -> forget if stale/sensitive
```

# Related Documents

- [[WorkerMemory-Part01]]
- [[WorkerMemory-Part06]]

