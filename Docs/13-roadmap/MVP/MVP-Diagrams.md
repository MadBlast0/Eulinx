---
title: MVP Diagrams
status: draft
version: 1.0
tags: [roadmap, diagrams]
related: ["[[MVP-Part01]]"]
---

# MVP Diagrams

```mermaid
flowchart LR
  subgraph IN["In Scope (MUST ship)"]
    S1["Tauri v2 + React 19 Shell"]
    S2["Single Workspace (local folder)"]
    S3["Worker Terminal (Rust PTY)"]
    S4["Single Provider (BYOK streaming)"]
    S5["Artifact Node (React Flow)"]
    S6["Verifier (build/lint/test)"]
    S7["Merge Manager + Lock Manager"]
    S8["SQLite Persistence"]
    S9["3-pane Layout (nav/canvas/context)"]
  end
  subgraph OUT["Out of Scope (MUST NOT ship)"]
    O1["Orchestrator hierarchy"]
    O2["Refinement loop"]
    O3["Full Memory (Phase 2)"]
    O4["Multi-provider routing"]
    O5["Workflow Engine (Phase 4)"]
    O6["MCP / Plugins / Marketplace"]
    O7["Cost analytics / Sync / Accounts"]
  end
  S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7 --> S8 --> S9
```

```text
MVP SCOPE
  IN SCOPE --------------------------------- OUT OF SCOPE
  Tauri+React shell                         no orchestrators (1 worker ok)
  single local Workspace                    no refinement loop
  Worker Terminal (Rust PTY)                no memory beyond SQLite (P2)
  one BYOK provider streaming               no multi-provider routing
  Artifact node on canvas                   no workflow engine (P4)
  Verifier (build/lint/test)                no MCP/plugin/marketplace
  Merge + Lock Manager                      no tool registry beyond FS/term
  SQLite persistence                        no cost analytics / sync / accts
  3-pane layout                             no collab / multi-workspace

CORE LOOP (the thing MVP proves):
  User spawns worker
    -> worker runs AI CLI on task
    -> worker emits Artifact
    -> Verifier checks (pass/fail)
    -> Merge Manager applies (only passing)
    -> Lock Manager serializes same-file edits
    -> Workspace + Canvas + SQLite updated
```

# Related Documents

- [[MVP-Part01]]
- [[06-workflow-engine/README]]
- [[12-development/README]]
- [[04-memory/README]]
