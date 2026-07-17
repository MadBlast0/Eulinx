---
title: VectorMemory Diagrams
status: draft
version: 1.0
tags: [memory, diagrams]
related:
  - "[[VectorMemory-Part01]]"
---

# VectorMemory Diagrams

```mermaid
flowchart TD
  A["Source"] --> B["Chunk"]
  B --> C["Embed"]
  C --> D["Vector Store"]
  D --> E["Hybrid Retrieval"]
  E --> F["Permission Filter"]
```

