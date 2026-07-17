---
title: PerformanceTesting Specification - Part 02
status: draft
version: 1.0
tags:
  - testing
  - performance-testing
  - ui
related:
  - "[[PerformanceTesting-Part01]]"
  - "[[PerformanceTesting-Part03]]"
---

# PerformanceTesting Specification (Part 02)

## Document Index

Part 01 - Budgets, Frame Budget, and Philosophy
Part 02 - Canvas, Terminal, and UI Throughput
Part 03 - Runtime, Memory, and Concurrency Load
Part 04 - Benchmark Harness and CI Enforcement

# Canvas Throughput

The React Flow node graph (per [[06-workflow-engine/README]]) MUST be benchmarked for:

- initial render time at 10 / 50 / 100 / 250 nodes,
- pan and zoom frame time at those sizes,
- edge animation cost with N animated packets in flight,
- memory retained after deleting a subgraph.

Tests MUST assert frame time against the tier budgets in Part 01 and MUST measure with a warm-up run to avoid JIT noise.

# Terminal Throughput

xterm.js terminals backed by Rust PTY (per ChatHistory) MUST be benchmarked for:

- lines-per-second ingested without dropped frames,
- cost of rendering a maximized terminal vs a compact chip vs a minimized chip,
- cost of 20 simultaneously streaming terminals.

# UI Component Budgets

- theme switch (runtime light/dark) MUST complete without a visible flash and within budget,
- opening a modal/popover MUST measure collision + portal render within frame budget,
- virtualized lists MUST keep constant time regardless of row count.

# Related Documents

- [[07-ui-ux/Animations-Part01]]
- [[07-ui-ux/NodeGraph-Part01]]
