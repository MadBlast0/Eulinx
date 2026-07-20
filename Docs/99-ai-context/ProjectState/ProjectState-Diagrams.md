---
title: ProjectState Diagrams
status: final
version: 2.0
tags: [ai-context, diagrams]
related: ["[[ProjectState-Part01]]"]
---

# ProjectState Diagrams

```mermaid
flowchart TD
  subgraph RUNTIME["TypeScript Runtime Engine"]
    RT["RuntimeManager\nScheduler\nEventBus\nServiceRegistry"]
    WK["Worker System\n(spawn/lifecycle/hierarchy/comm/health)"]
    AF["Artifact System\n(lifecycle/verify/merge/version)"]
    WF["Workflow Engine\n(DAG/retry/executors)"]
    MEM["Memory System\n(STM/LTM/vector/knowledge-base)"]
  end
  subgraph ORCH["AI / Orchestrators"]
    PL["Planner"]
    CR["Critic / Judge"]
    BL["Builder / Architect"]
    RL["Refinement Loop"]
  end
  subgraph UI["React 19 + Flow UI"]
    WS["Workspace Layout\nNode Graph\nPanels"]
    TERM["Terminal (xterm.js)"]
    TK["Themes / Tokens\nAccessibility"]
  end
  subgraph RUST["Rust Thin Backend (Tauri v2)"]
    DB["SQLite (rusqlite)\n27 entity tables"]
    PTY["PTY / Terminal"]
    FS["Filesystem / Git"]
    WIN["Window / Dialog"]
  end
  subgraph PLUGIN["Plugin System"]
    HK["Hook System"]
    MCP["MCP Client"]
    TL["Tool Registry"]
  end
  RUNTIME --> ORCH
  ORCH --> UI
  RUNTIME --> RUST
  RUNTIME --> PLUGIN
  UI --> RUST
```

```text
ARCHITECTURE OVERVIEW

LAYER                    STATUS           KEY FILES
─────────────────────────────────────────────────────
TypeScript Runtime       ✅ IMPLEMENTED   runtime/, scheduler/, event-bus/
Worker System            ✅ IMPLEMENTED   spawner/, worker/
Artifact System           ✅ IMPLEMENTED   artifact/
Workflow Engine          ✅ IMPLEMENTED   workflow/
Memory System            ✅ IMPLEMENTED   memory/
AI / Orchestrators       ✅ IMPLEMENTED   orchestrator/, roles/
API Layer                ✅ IMPLEMENTED   api/services/
Database (Rust SQLite)   ✅ IMPLEMENTED   src-tauri/src/managers/db_manager.rs
Plugin System            ✅ IMPLEMENTED   plugins/
Built-in Tools           ✅ IMPLEMENTED   tools/
UI                       ✅ IMPLEMENTED   ui/
Testing                  ✅ IMPLEMENTED   128 test files, cargo tests

DEFERRED TO FUTURE:
  - Distributed execution
  - Remote marketplace
  - Advanced vector DB (LanceDB)
  - Full-text engine (Tantivy)
  - Collaboration features
```

# Related Documents

- [[ProjectState-Part01]]
- [[CurrentProgress/CurrentProgress-Part01]]
- [[ImplementationGapAudit]]
