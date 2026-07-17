---
title: PerformanceTesting Diagrams
status: draft
version: 1.0
tags:
  - testing
  - diagrams
related:
  - "[[PerformanceTesting-Part01]]"
---

# PerformanceTesting Diagrams

```mermaid
flowchart TD
  H["Benchmark Harness"] --> W["Warm-up run (excluded)"]
  H --> M["Measured run"]
  M --> BUD["Budget + Tolerance"]
  BUD -->|within| PASS["Pass"]
  BUD -->|exceeds| FAIL["Fail build Gate 4"]
  M --> BASE["Stored Baseline"]
  BASE --> REG["Regression diff > 10% blocks merge"]
```

```text
Frame Budget
  60fps => 16ms per interactive frame (hard)
  100+ nodes => 33ms floor during pan/zoom
  terminal => keep pace, no dropped frames
  memory => bounded per workspace, no leak
```

# Related Documents

- [[PerformanceTesting-Part01]]
- [[TestingStrategy-Part04]]
