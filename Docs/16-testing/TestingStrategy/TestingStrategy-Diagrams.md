---
title: TestingStrategy Diagrams
status: draft
version: 1.0
tags:
  - testing
  - diagrams
related:
  - "[[TestingStrategy-Part01]]"
---

# TestingStrategy Diagrams

```mermaid
flowchart LR
  LOC["local mode"] --> U["Unit + fast Integration"]
  CI["ci mode"] --> U2["Unit + Integration + Worker + Perf + Security + Regression"]
  E2E["e2e mode"] --> P["Playwright on Tauri shell"]
  U2 --> GATE["CI Gates 1-6 blocking"]
  P --> GREL["Gate 7 release-blocking"]
```

```text
CI Execution Order
  Gate1 Unit -------- block
  Gate2 Integration - block
  Gate3 Worker ------ block
  Gate4 Performance -- block
  Gate5 Security ----- block
  Gate6 Regression --- block
  Gate7 E2E --------- release-block
```

```mermaid
flowchart TD
  SVC["Frontend Service"] -->|fake invoke in unit| FAKE["Invoke Fake"]
  SVC -->|real router in integration| ROUTER["Tauri Command Router"]
  ROUTER --> RUST["Rust Command"]
  RUST --> FS["In-Memory FS Fake"]
  RUST --> SQL["Temp SQLite"]
```

# Related Documents

- [[TestingStrategy-Part01]]
- [[IntegrationTesting-Part01]]
