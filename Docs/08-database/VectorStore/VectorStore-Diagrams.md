---
title: VectorStore Diagrams
status: draft
version: 1.0
tags:
  - database
  - diagrams
related:
  - "[[VectorStore-Part01]]"
---

# VectorStore Diagrams

```mermaid
flowchart TD
  W["RepositoryLayer write"] --> SQL["SQLite commit"]
  SQL --> EV["EventBus event"]
  EV --> PROJ["VectorStore projection"]
  PROJ --> TXT["Load source text (backend)"]
  TXT --> CH["Chunk text"]
  CH --> EMB["Embed with model"]
  EMB --> LDB["LanceDB table (by embedding_model)"]
  LDB --> VS["Vectors (derived)"]

  Q["Semantic query + workspace_id"] --> EQ["Embed query"]
  EQ --> N["Nearest neighbors (cosine)"]
  N --> RE["Re-check source in SQLite + scope"]
  RE --> OUT["Return verified results"]
  TQ["Keyword query (Tantivy)"] --> FUSE["Hybrid fusion"] --> RE
```

```mermaid
flowchart TD
  START["Startup / corrupt / model change"] --> RB["Open fresh LanceDB table per model"]
  RB --> STR["Stream SQLite sources (workspace-scoped)"]
  STR --> EMB["Chunk + embed in backend"]
  EMB --> ADD["Write vectors"]
  ADD --> MK["Write vector_store_version marker"]
  MK --> DONE["Table consistent with SQLite"]
```

# ASCII Overview

```text
Write:  SQLite commit -> EventBus -> embed (backend) -> LanceDB (async)
Read:   embed query -> nearest neighbors -> re-check SQLite + scope -> results
Hybrid: Tantivy (keyword) fused with LanceDB (semantic), then SQLite re-check
Recover: rebuild per embedding_model from source text (always rebuildable)
```
