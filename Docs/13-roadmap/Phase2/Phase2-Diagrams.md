---
title: Phase2 Diagrams
status: draft
version: 1.0
tags: [roadmap, diagrams]
related: ["[[Phase2-Part01]]"]
---

# Phase2 Diagrams

```mermaid
flowchart TD
  P1["Phase 1: Kernel + Bus + State + Resources + Scheduler"] --> P2["Phase 2: Real Multi-Worker Runtime"]

  subgraph P2B["Phase 2 Build Order"]
    SP["1. Spawner (PHASE 07)\nreserve resources, validate, boot pipeline, restart/destroy"]
    SE["2. Session System (PHASE 08)\npersist, snapshot, resume, branch, replay"]
    WK["3. Worker System (PHASE 09)\nlifecycle, messaging, health, scaling, coordination"]
    MEM["4. Memory (PHASE 10)\nSTM/LTM/episodic/semantic/working + vectors + search"]
  end

  P2 --> SP --> SE --> WK --> MEM

  SP -. creates .-> WK
  SP -. creates .-> SE
  WK -->|publishes| BUS["Event Bus (P1)"]
  SE -->|context injection| WK
  WK -->|recall/inject| MEM
  MEM -->|scoped search| WK

  subgraph WL["Worker Lifecycle"]
    C["Created"] --> I["Initializing"] --> ID["Idle"] --> PL["Planning"]
    PL --> WO["Working"] --> WA["Waiting"] --> NH["Needs Human"]
    WO --> BL["Blocked"] --> WO
    WO --> CO["Completed"] --> AR["Archived"] --> DE["Destroyed"]
  end
```

```text
PHASE 2 — consumes the Phase 1 foundation (kernel/bus/state/resources/scheduler)

Prerequisites: Phase 1 complete.

BUILD ORDER (strict):
  (1) Spawner      PHASE 07  -> HOW things are created (Scheduler decides WHEN)
                              reserves resources, validates, boot pipeline, cleanup/restart
                              enables "workers spawn workers" (graph grows dynamically)
        |
        v
  (2) Session System PHASE 08 -> scoped convo/exec context; snapshot, resume, branch, replay
        |                         selective context injection (never full transcript)
        v
  (3) Worker System  PHASE 09 -> lifecycle state machine (see below); channels + artifacts
        |                         health recovery; scaling/pools; coordination w/ isolation
        v
  (4) Memory         PHASE 10 -> STM, LTM, episodic, semantic, working memory
                                embeddings + vector (LanceDB), search (Tantivy)
                                summaries/compression/pruning, policies, manager
                                scoped to workspace; artifact refs > copied content

WORKER LIFECYCLE STATE MACHINE:
  Created -> Initializing -> Idle -> Planning -> Working
  Working -> Waiting / Blocked / Needs Human / Completed
  Completed -> Archived -> Destroyed
  (Blocked/Needs Human can return to Working)

COMMS MODEL: workers publish to channels + pass Artifacts; NO full-transcript passing.

ACCEPTANCE: spawn/restart/destroy w/ cleanup; sessions persist/branch/replay; lifecycle
observable as events; channel+artifact comms; memory scoped/searchable/injectable.
```

# Related Documents

- [[Phase2-Part01]]
- [[06-workflow-engine/README]]
- [[12-development/README]]
- [[04-memory/README]]
