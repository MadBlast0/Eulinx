---
title: RegressionTesting Specification - Part 02
status: draft
version: 1.0
tags:
  - testing
  - regression-testing
  - fixtures
related:
  - "[[RegressionTesting-Part01]]"
  - "[[RegressionTesting-Part03]]"
---

# RegressionTesting Specification (Part 02)

## Document Index

Part 01 - Purpose, Replay-Based Regression, and Capture
Part 02 - Bug-Replay Library and Fixture Lifecycle
Part 03 - Flaky Test Quarantine and Triage
Part 04 - CI Gates and Release Blocking

# Bug-Replay Library

Every fixed defect with runtime impact MUST leave a Replay in the regression library, organized by subsystem:

- worker lifecycle regressions,
- artifact merge/conflict regressions,
- lock contention regressions,
- memory injection / redaction regressions,
- permission denial regressions,
- refinement loop stopping-rule regressions,
- performance-baseline regressions.

# Fixture Lifecycle

Regression fixtures MUST be:

- versioned alongside the code so an old Replay that no longer matches the runtime is updated deliberately,
- stored compactly (references, not full transcripts),
- replayable in `ci` mode without a Tauri window,
- diffed against the expected outcome; any divergence fails the gate.

# Ownership

Each regression fixture MUST name the ADR or issue it guards so a future change that "intentionally" breaks it is reviewed, not silently deleted.

# Related Documents

- [[04-memory/Replay/Replay-Part01]]
- [[TestingStrategy-Part03]]
