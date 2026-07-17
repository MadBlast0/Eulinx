---
title: PerformanceTesting Specification - Part 01
status: draft
version: 1.0
tags:
  - testing
  - performance-testing
  - budgets
related:
  - "[[16-testing/README]]"
  - "[[PerformanceTesting-Part02]]"
---

# PerformanceTesting Specification (Part 01)

## Document Index

Part 01 - Budgets, Frame Budget, and Philosophy
Part 02 - Canvas, Terminal, and UI Throughput
Part 03 - Runtime, Memory, and Concurrency Load
Part 04 - Benchmark Harness and CI Enforcement

# Purpose

PerformanceTesting enforces Eulinx's responsiveness budgets so the app stays smooth even with 100+ Workers, animated node graphs, and live terminals.

Eulinx is a desktop app where the user watches agents work in real time. Jank destroys trust in the visualization. Performance is a feature, not a metric.

# The Frame Budget

Eulinx targets 60fps for interactive UI. That gives a hard budget of ~16ms per frame for all work on the main thread that blocks painting.

Rules:

- any single interaction-handler frame MUST stay within 16ms on reference hardware,
- animation work (data-flow packets, node glows) MUST be GPU-composited and MUST NOT force layout thrash,
- if a task cannot fit in 16ms, it MUST be chunked, moved to a worker thread, or deferred to idle.

# The Cheap-Model Constraint

Because Eulinx is built by a cheaper coding model, performance regressions are likely. Performance tests are the automated guardrail that the model cannot reason about by intuition.

# Budget Tiers

- Interactive frame: 16ms (hard).
- Canvas with <= 50 nodes: 60fps sustained.
- Canvas with 100+ nodes: no frame may exceed 33ms (30fps floor) during pan/zoom.
- Terminal scroll throughput: must keep pace with PTY output without dropping frames.
- Cold start to interactive shell: bounded and measured, not asserted strictly (environment-dependent).

# Related Documents

- [[PerformanceTesting-Part02]]
- [[07-ui-ux/Animations-Part01]]
