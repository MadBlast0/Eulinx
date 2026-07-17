---
title: Memory Diagrams
status: draft
version: 1.0
tags:
  - core-concepts
  - diagrams
related:
  - "[[Memory-Part01]]"
---

# Memory Diagrams

```mermaid
flowchart TD
  subgraph Types["Memory Types (scope / lifetime)"]
    WM["Working Memory"]
    TM["Task Memory"]
    WKM["Worker Memory"]
    WSM["Workspace Memory"]
    SM["Session Memory"]
    LTK["Long-Term Knowledge"]
    AR["Artifact References"]
  end
  RT["Runtime\nowns memory"] --> Types
  Types --> INJ["Context Injection"]
  INJ --> WC["Worker Context"]
```

```mermaid
flowchart TD
  REQ["Memory Request"] --> SC["Scope Filter\nWorker/Task/Session/Workspace/Global"]
  SC --> IX["Indexing\nembeddings / tags / metadata"]
  IX --> AV["Available"]
  AV --> RET["Retrieval\nsemantic / keyword / tag / recency"]
  RET --> INJ["Context Injection\nonly relevant memory"]
  INJ --> WC["Worker Context"]
```

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> Indexed
  Indexed --> Available
  Available --> Retrieved
  Retrieved --> Updated
  Updated --> Archived
  Archived --> Deleted
```

```text
Memory is owned by the Runtime, not Workers. Workers consume; Runtime manages.

Storage layers
  Working Memory
  Session Memory
  Workspace Memory
  Knowledge Memory
  Artifact References
  Vector Index
  Metadata Store
  (each with its own retention policy)

Scopes (lower expires sooner)
  Worker ? Task ? Session ? Workspace ? Global (system only)

Lifecycle
  Created ? Indexed ? Available ? Retrieved ? Updated ? Archived ? Deleted(optional)

Retrieval selects by: semantic similarity, keywords, tags, scope, recency, relevance.
Runtime MUST avoid unnecessary context expansion.
```
# Related Documents
- [[Memory-Part01]]
- [[Memory-Part02]]
- [[Memory-Part03]]
- [[04-memory/README]]
