---
title: Coding Diagrams
status: draft
version: 1.0
tags:
  - features
  - coding
  - diagrams
related:
  - "[[Coding-Part01]]"
---

# Coding Diagrams

```mermaid
flowchart TD
  G["User Goal"] --> O["Orchestrator"]
  O --> W1["Worker A (symbol Login)"]
  O --> W2["Worker B (symbol JWT)"]
  W1 --> A1["Artifact / Patch"]
  W2 --> A2["Artifact / Patch"]
  A1 --> V["Verifier (build/lint/test)"]
  A2 --> V
  V --> M["MergeManager"]
  M --> WS["Workspace Tree"]
```

```text
goal
  -> orchestrator spawns workers
  -> each edits a sandbox (symbol-locked)
  -> artifact/patch
  -> verifier
  -> merge
  -> workspace
```

# Related Documents

- [[Coding-Part01]]
