---
title: PerformanceTesting Specification - Part 04
status: draft
version: 1.0
tags:
  - testing
  - performance-testing
  - ci
related:
  - "[[PerformanceTesting-Part03]]"
  - "[[TestingStrategy-Part04]]"
---

# PerformanceTesting Specification (Part 04)

## Document Index

Part 01 - Budgets, Frame Budget, and Philosophy
Part 02 - Canvas, Terminal, and UI Throughput
Part 03 - Runtime, Memory, and Concurrency Load
Part 04 - Benchmark Harness and CI Enforcement

# Benchmark Harness

Performance tests use a stable in-repo harness:

- Vitest `bench` for TypeScript frame/throughput measurements,
- `cargo bench` for Rust PTY/lock/merge throughput,
- a fixed reference dataset (node counts, terminal counts, worker counts) so results are comparable across runs.

# Tolerance and Warm-up

- every benchmark runs a warm-up iteration excluded from the measurement,
- assertions use a tolerance margin (e.g. budget + 15%) to absorb machine variance,
- a measurement exceeding the tolerated budget FAILS the build (Gate 4).

# Regression Detection

- benchmark results are stored as artifacts per CI run,
- a significant regression (e.g. > 10% over the previous run) is reported and, for runtime-critical paths, blocks merge,
- the recorded baseline MUST be updated deliberately via a reviewed commit, never silently.

# AI Notes

Do not assert exact milliseconds across machines; assert against the budget with the tolerance margin.

Do not put performance assertions in unit tests that run thousands of times; keep them in the benchmark harness.

# Related Documents

- [[TestingStrategy-Part04]]
- [[RegressionTesting-Part04]]
