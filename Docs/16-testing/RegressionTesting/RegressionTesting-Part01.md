---
title: RegressionTesting Specification - Part 01
status: draft
version: 1.0
tags:
  - testing
  - regression-testing
  - replay
related:
  - "[[16-testing/README]]"
  - "[[RegressionTesting-Part02]]"
  - "[[04-memory/Replay/Replay-Part01]]"
---

# RegressionTesting Specification (Part 01)

## Document Index

Part 01 - Purpose, Replay-Based Regression, and Capture
Part 02 - Bug-Replay Library and Fixture Lifecycle
Part 03 - Flaky Test Quarantine and Triage
Part 04 - CI Gates and Release Blocking

# Purpose

RegressionTesting ensures that a fixed bug never returns and that performance and behaviour budgets do not silently regress. It is the top guard of the pyramid that feeds the CI merge gate.

Eulinx's runtime is complex and authored by a cheaper model. Without replay-based regression, the same class of bug will recur. RegressionTesting turns every fixed defect into a permanent, executable assertion.

# Replay-Based Regression

The foundation is the Replay system (per [[04-memory/Replay/Replay-Part01]]). When a bug is fixed, its recorded session becomes a regression fixture that MUST stay green.

Principle: if a behaviour was observed once and mattered, it MUST be replayable and asserted forever.

# What Regression Testing Owns

- a curated library of recorded sessions that exercise previously broken paths,
- behaviour assertions that the runtime still produces the corrected outcome,
- performance-baseline comparisons (see [[PerformanceTesting-Part04]]),
- the quarantine and triage process for flaky tests.

# Capture Discipline

When a bug is reported:

- reproduce it live and record the session as a Replay,
- add a focused regression test that fails on the buggy behaviour and passes on the fix,
- the regression test enters the CI gate (Gate 6) and blocks any future regression.

# Related Documents

- [[RegressionTesting-Part02]]
- [[04-memory/Replay/Replay-Part01]]
- [[WorkerTesting-Part01]]
