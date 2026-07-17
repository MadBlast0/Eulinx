---
title: WorkerTermination Diagrams
status: draft
version: 1.0
tags:
  - worker-system
  - worker-termination
  - diagrams
related:
  - "[[WorkerTermination-Part01]]"
---

# WorkerTermination Diagrams

```mermaid
flowchart TD
  A["Termination Requested"] --> B{"Mode"}
  B -->|"Graceful"| C["Drain and Summarize"]
  B -->|"Force"| D["Stop Process"]
  B -->|"Emergency"| E["Kill and Quarantine"]
  C --> F["Flush Artifacts"]
  D --> F
  E --> F
  F --> G["Release Locks"]
  G --> H["Revoke Grants"]
  H --> I["Post-Mortem"]
```

```text
Stop Worker
  -> preserve useful output
  -> cleanup resources
  -> record why
  -> notify parent
```

# Related Documents

- [[WorkerTermination-Part01]]
- [[WorkerTermination-Part05]]

