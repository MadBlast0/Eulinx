---
title: RegressionTesting Diagrams
status: draft
version: 1.0
tags:
  - testing
  - diagrams
related:
  - "[[RegressionTesting-Part01]]"
---

# RegressionTesting Diagrams

```mermaid
flowchart TD
  BUG["Reported Bug"] --> LIVE["Reproduce + Record Replay"]
  LIVE --> FIX["Fix Code"]
  FIX --> RT["Add Regression Test (fails on bug, passes on fix)"]
  RT --> GATE["CI Gate 6"]
  GATE -->|green| MERGE["Merge Allowed"]
  GATE -->|red| BLOCK["Block Merge"]
  PERF["Perf Baseline"] --> DIFF["Diff > 10%"]
  DIFF -->|critical path| BLOCK
  QUAR["Quarantine Suite"] --> REPORT["Report-only"]
```

```text
Regression Flow
  bug -> record replay -> fix -> assert on replay -> guard forever
  perf -> baseline diff -> block on critical regression
  flake -> quarantine -> fix determinism -> restore
```

# Related Documents

- [[RegressionTesting-Part01]]
- [[04-memory/Replay/Replay-Part01]]
- [[TestingStrategy-Part04]]
