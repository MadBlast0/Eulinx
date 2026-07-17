---
title: ProjectState Diagrams
status: draft
version: 1.0
tags: [ai-context, diagrams]
related: ["[[ProjectState-Part01]]"]
---

# ProjectState Diagrams

```mermaid
flowchart TD
  subgraph DOC["Documentation state"]
    DC["Complete: 00-04, 12, 13, 16, 17"]
    DP["Structured/partial: 05, 06-11, 99"]
  end
  subgraph CODE["Application code state"]
    CS["Setup stage only\nintended stack: Tauri v2 + React19 + TS + Vite + pnpm\nTailwind+shadcn, Zustand, TanStack Query, React Flow,\nxterm.js, SQLite(SQLx), LanceDB, Tantivy"]
  end
  subgraph NOTBUILT["NOT yet built (in code)"]
    NB1["Runtime kernel (Scheduler/EventBus/Merge/Lock)"]
    NB2["Worker spawner / live terminal"]
    NB3["Workflow Engine executing graphs"]
    NB4["Artifact/Verifier/Merge path"]
    NB5["UI canvas beyond scaffolding"]
  end
  DOC -->|"ahead of"| CODE
  CODE -->|"none of these exist"| NOTBUILT
  NOTBUILT -->|"build via"| ROAD["Roadmap phases (small tasks)"]
```

```text
CURRENT BUILD STATE

DOCUMENTATION  (single source of truth, ahead of code)
  complete : 00-04, 12, 13, 16, 17
  partial  : 05, 06-11, 99

APPLICATION CODE
  setup stage only
  stack: Tauri v2 / React 19 / TS / Vite / pnpm
         Tailwind+shadcn, Zustand, TanStack Query
         React Flow, xterm.js, SQLite(SQLx), LanceDB, Tantivy
  first targets: design-system skeleton + thin Rust PTY bridge

NOT YET BUILT (do not assume existence)
  runtime kernel (Scheduler, EventBus, MergeManager, LockManager)
  worker spawner / live terminal execution
  workflow engine executing graphs
  artifact/verifier/merge path
  UI canvas beyond scaffolding

CONSEQUENCE: prove headless loop before UI; keep Rust thin
```

# Related Documents

- [[ProjectState-Part01]]
- [[06-workflow-engine/README]]
- [[07-ui-ux/README]]
- [[04-memory/README]]
- [[12-development/README]]
