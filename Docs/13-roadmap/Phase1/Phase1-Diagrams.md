---
title: Phase1 Diagrams
status: draft
version: 1.0
tags: [roadmap, diagrams]
related: ["[[Phase1-Part01]]"]
---

# Phase1 Diagrams

```mermaid
flowchart TD
  MVP["MVP (minimal runtime manager)"] --> P1["Phase 1: Deterministic Execution Foundation"]

  subgraph P1S["Phase 1 Build Order"]
    K["1. Runtime Kernel (PHASE 02)\nlifecycle, bootstrap, shutdown, registry, health, recovery"]
    E["2. Event Bus (PHASE 03)\ndispatch, subscribe, dead-letter, replay, middleware"]
    ST["3. State System (PHASE 04)\npersistence, snapshots, recovery"]
    R["4. Resource Manager (PHASE 05)\nCPU/mem/disk/net/GPU, token + cost budget, quotas"]
    SC["5. Scheduler (PHASE 06)\nqueue, priority, parallel, delayed/cron, retry, backpressure"]
  end

  P1 --> K --> E --> ST --> R --> SC
  SC --> P2["Phase 2: Spawner / Sessions / Workers / Memory"]

  E -. carries signals .-> ST
  E -. carries signals .-> R
  E -. carries signals .-> SC
  R -. capacity .-> SC
  ST -. durable state .-> K
```

```text
PHASE 1 — REPLACES MVP's minimal runtime manager with the real foundation

Prerequisites: MVP demoable, Foundation (PHASE 01) stable.

DEPENDENCY / BUILD ORDER (strict):
  (1) Runtime Kernel      PHASE 02  -> boots/closes/recovers Rust backend; no LLM
        |
        v
  (2) Event Bus           PHASE 03  -> ONLY cross-subsystem comms path; dead-letter, replay
        |
        v
  (3) State System        PHASE 04  -> runtime/worker/session/workflow/artifact/task state
        |                               snapshots + recovery to SQLite
        v
  (4) Resource Manager    PHASE 05  -> finite capacity: CPU/mem/disk/net/GPU + TOKEN/COST
        |                               budgets, quotas, monitoring
        v
  (5) Scheduler           PHASE 06  -> when work runs: FIFO/priority/parallel/delayed/cron
                                        retry/dead queue, concurrency, backpressure, cancel

WHY BEFORE WORKERS: Worker System (P2) assumes scheduler + state + bus exist.

ACCEPTANCE: every subsystem talks via Event Bus (no direct calls); state persists/restores;
Resource Manager enforces budgets; Scheduler queues/prioritizes/retries/cancels + backpressure.
```

# Related Documents

- [[Phase1-Part01]]
- [[06-workflow-engine/README]]
- [[12-development/README]]
- [[04-memory/README]]
