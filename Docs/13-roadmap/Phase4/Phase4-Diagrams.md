---
title: Phase4 Diagrams
status: draft
version: 1.0
tags: [roadmap, diagrams]
related: ["[[Phase4-Part01]]"]
---

# Phase4 Diagrams

```mermaid
flowchart TD
  P3["Phase 3: Artifacts / Providers / Prompts / Tools / Security"] --> P4["Phase 4: The Eulinx Studio"]

  subgraph P4B["Phase 4 Build Order"]
    O["1. Orchestrators (PHASE 16)\nplanner/architect/researcher/.../coordinator"]
    W["2. Workflow Engine (PHASE 17)\nDAG, branches, parallelism, approval, retry, templates"]
    C["3. CLI (PHASE 18)\ninit/doctor/spawn/worker/session/memory/.../plugin/update"]
    U["4. UI (PHASE 19)\ndashboard, explorer, browsers, designer, cost, settings"]
    OB["5. Observability (PHASE 20)\nmetrics, tracing, profiling, health, alerts, cost"]
  end

  P4 --> O --> W --> C --> U --> OB

  subgraph ORCH["Orchestrator Hierarchy (AI roles over generic workers)"]
    R["Root Orchestrator"] --> PH["Phase Orchestrator"]
    PH --> TK["Task Orchestrator"]
    TK --> WR["Worker (generic, executes)"]
  end
  O --- ORCH

  subgraph DET["PHASE 21 (release) hardening at end"]
    REL["tests, security audit, installers, auto-update, crash recovery, backup, versioning"]
  end
  OB --> REL

  W -->|drives, does not duplicate| O
  U -->|reads state, emits intents| W
```

```text
PHASE 4 — turns the engine into a usable local-first desktop studio

Prerequisites: Phase 3 (Artifacts, Providers, Prompts, Tools, Security).

BUILD ORDER (strict):
  (1) Orchestrators   PHASE 16 -> AI planning/coordination layer (LLM). Hierarchy:
        |               Root -> Phase -> Task -> Worker. Plans rewrite at runtime;
        |               progress aggregates upward (worker -> task -> phase -> project).
        |               Layered on generic workers; runtime services stay deterministic/LLM-free.
        v
  (2) Workflow Engine PHASE 17 -> DAG execution: deps, branches, parallelism, human-approval,
        |               retry, resume, checkpoints, templates. Node types: worker/tool/logic-gate/
        |               I/O/builder-verifier/artifact/memory/MCP/human-approval/delay.
        v
  (3) CLI             PHASE 18 -> headless/scriptable: init/doctor/runtime/scheduler/spawn/
        |               worker/session/memory/artifact/provider/workflow/prompt/tool/config/plugin/update
        v
  (4) UI              PHASE 19 -> 3-pane studio: dashboard, runtime monitor, worker/session/
        |               memory/artifact browsers, prompt inspector, workflow designer, logs,
        |               metrics, cost dashboard, settings. NO business logic (reads state only).
        v
  (5) Observability   PHASE 20 -> metrics, tracing, profiling, health, alerts, analytics,
                      usage, cost tracking, performance. Ties artifact journey end-to-end.

END OF PHASE 4: PHASE 21 release hardening (tests, audit, packaging, installers, auto-update,
crash recovery, backup, versioning, release pipeline). Eulinx = visual multi-agent studio.

RISKS: orchestrator token cost (+90%/15x) -> budget guards + refinement slider enforced;
UI logic creep -> "UI has no business logic"; Workflow vs Orchestrator overlap -> keep
Workflow deterministic, orchestrators drive it.
```

# Related Documents

- [[Phase4-Part01]]
- [[06-workflow-engine/README]]
- [[12-development/README]]
- [[04-memory/README]]
