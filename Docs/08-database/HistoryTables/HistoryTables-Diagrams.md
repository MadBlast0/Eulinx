---
title: HistoryTables Diagrams
status: draft
version: 1.0
tags:
  - database
  - diagrams
related:
  - "[[HistoryTables-Part01]]"
---

# HistoryTables Diagrams

```mermaid
flowchart TD
  SVC["Runtime Service"] --> TX["BEGIN IMMEDIATE"]
  TX --> ST["UPDATE current-state table"]
  TX --> SEQ["Allocate sequence"]
  SEQ --> EL["INSERT event_log envelope"]
  TX --> DH["INSERT domain history row (sequence FK)"]
  ST --> CM["COMMIT"]
  EL --> CM
  DH --> CM
  CM --> BUS["EventBus publish"]
  BUS -.->|"replay-grade"| PROJ["Projection -> event_log (durable copy)"]
  EL --> RP["Replay"]
  EL --> AU["Audit view"]
  DH --> UN["Undo via merge_history"]
  DH --> CO["Cost reporting"]
  CM -.->|"fail"| RB["ROLLBACK. No state, no history."]
```

```mermaid
flowchart TD
  subgraph PROTECTED["Protected family - never pruned"]
    MH["merge_history"]
    PH["permission_history"]
  end
  subgraph PRUNABLE["Prunable family - rolled up then pruned"]
    EV["event_log"]
    WH["worker_history"]
    AH["artifact_history"]
    CL["cost_ledger"]
  end
  PRUNABLE --> ROLL["history_rollup"]
  PRUNABLE --> PR["pruned_range (gap report)"]
  PROTECTED -.->|"survives"| AU["Audit forever"]
```

# ASCII Overview

```text
Current state (mutable)        History (append-only)
---------------------          ---------------------
workers / runs / artifacts     event_log (spine, by sequence)
                                + domain projections:
                                    worker_history
                                    artifact_history
                                    merge_history     (protected)
                                    permission_history (protected)
                                    cost_ledger
                                |
                                v
                          Retention:
                            prunable -> rollup -> prune
                            protected -> retained forever
```
