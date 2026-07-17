---
title: RunStatePersistence Diagrams
status: draft
version: 1.0
tags:
  - database
  - diagrams
related:
  - "[[RunStatePersistence-Part01]]"
---

# RunStatePersistence Diagrams

```mermaid
flowchart TD
  ENG["WorkflowEngine tick"] --> COMP["Compute next state"]
  COMP --> PERS["persist_run_state"]
  PERS --> TX["BEGIN"]
  TX --> RUN["upsert run (tick, status, engine_version)"]
  TX --> STEP["upsert run_step rows"]
  TX --> CTX["upsert run_context"]
  TX --> HIST["append step transitions (history)"]
  RUN --> CM["COMMIT"]
  STEP --> CM
  CTX --> CM
  HIST --> CM
  CM --> NEXT["Engine proceeds to next tick"]
  CM -.->|"fail"| DEG["Runtime degraded. Retry. Do NOT tick."]
```

```mermaid
flowchart TD
  OPEN["App open / resume"] --> RR["resume_run(run_id)"]
  RR --> LOAD["run + run_step[] + run_context"]
  LOAD --> ADJ["Rebuild adjacency from workflow/node/edge"]
  ADJ --> READY["Recompute ready set from step states"]
  READY --> CONT["Continue tick loop from current_tick"]
```

# ASCII Overview

```text
Engine tick
   |
   v
persist_run_state  (one transaction)
   |-- run (tick, status, engine_version)
   |-- run_step[] (status, attempt, refs)
   |-- run_context (port values, artifact_refs)
   |-- history transitions
   |
   v
COMMIT  ->  then tick onward

On reopen:
resume_run -> rebuild from rows -> continue (no re-run)
```
