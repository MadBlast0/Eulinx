---
title: Workspace Diagrams
status: draft
version: 1.0
tags:
  - core-concepts
  - workspace
  - diagrams
related:
  - "[[Workspace-Part01]]"
  - "[[Workspace-Part02]]"
  - "[[Workspace-Part03]]"
---

# Workspace Diagrams

```mermaid
flowchart TD
  U["User selects folder"] --> WM["WorkspaceManager"]
  WM --> FR["Workspace File Root"]
  WM --> DB["Workspace Database"]
  WM --> WMem["WorkspaceMemory"]
  WM --> WLAY["WorkspaceLayout per workspaceId"]
  WM --> PROJ["Projects"]
  PROJ --> PR1["Project A"]
  PROJ --> PR2["Project B"]
  WM --> RT["Runtime Services"]
  RT --> S["Sessions"]
  RT --> WK["Workers"]
  RT --> AR["Artifacts"]
  RT --> TK["Tasks"]
```

```mermaid
flowchart TD
  subgraph WS1["Workspace 1 - isolated boundary"]
    P1["Project A"] --> M1["Workspace Memory"]
    P1 --> S1["Sessions"]
  end
  subgraph WS2["Workspace 2 - isolated boundary"]
    P2["Project B"] --> M2["Workspace Memory"]
    P2 --> S2["Sessions"]
  end
  WS1 -. "NO cross-boundary access" .- WS2
```

```text
Workspace (top-level isolation boundary)
  |
  +-- File Root                (single local folder, all ops validated here)
  +-- Workspace Memory         (durable, scoped, never crosses boundary)
  +-- Permissions              (policies apply only inside this Workspace)
  +-- Agents + Terminal Sessions (Workers, Orchestrators, PTYs)
  +-- Runtime State            (Sessions, Tasks, Artifacts, History)
  +-- Settings                 (Workspace-level, not global)
  +-- Database                 (SQLite / LanceDB / Tantivy, bound to identity)
  |
  +-- Projects                 (units of work inside the Workspace)
        |
        +-- Project A
        +-- Project B
```

```text
Isolation boundaries (MUST NOT cross):
  Files      : one root per Workspace, validated on every op
  Memory     : Workspace memory not visible to other Workspaces
  Permissions: policies scoped to the Workspace
  Agents     : Workers/Orchestrators belong to one Workspace
  Sessions   : execution timelines scoped to one Workspace
  Database   : storage bound to Workspace identity
```

# Related Documents

- [[Workspace-Part01]]
- [[Workspace-Part02]]
- [[Workspace-Part03]]
- [[01-core-concepts/README]]
- [[WorkspaceManager-Part01]]
- [[WorkspaceMemory-Part01]]
- [[07-ui-ux/WorkspaceLayout/WorkspaceLayout-Part01]]
- [[Project-Part01]]
