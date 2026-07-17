---
title: SearchIndex Diagrams
status: draft
version: 1.0
tags:
  - database
  - diagrams
related:
  - "[[SearchIndex-Part01]]"
---

# SearchIndex Diagrams

```mermaid
flowchart TD
  W["RepositoryLayer write"] --> SQL["SQLite commit"]
  SQL --> EV["EventBus event"]
  EV --> PROJ["SearchIndex projection"]
  PROJ --> EX["Extract text (backend)"]
  EX --> TW["Tantivy index writer (add/update/delete)"]
  TW --> IDX["Inverted index (derived)"]

  Q["Search query (workspace_id + surface + text)"] --> TQ["Tantivy query + rank"]
  TQ --> HITS["Ranked hits (doc_id, snippet)"]
  HITS --> RE["Re-check each row in SQLite"]
  RE --> OUT["Return existing, non-deleted results"]
```

```mermaid
flowchart TD
  START["Startup / corruption / staleness"] --> RB["Open fresh Tantivy index"]
  RB --> STR["Stream SQLite rows per surface (workspace-scoped)"]
  STR --> EX["Extract text from artifact store"]
  EX --> ADD["Batch add Documents"]
  ADD --> MK["Write search_index_version marker"]
  MK --> DONE["Index consistent with SQLite"]
```

# ASCII Overview

```text
Write:  SQLite commit -> EventBus -> projection -> Tantivy (async, never blocks)
Read:   query (+workspace_id) -> Tantivy rank -> re-check SQLite -> results
Recover: rebuild from SQLite in batches (index is derived, always rebuildable)
```
