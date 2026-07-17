---
title: RegressionTesting Specification - Part 03
status: draft
version: 1.0
tags:
  - testing
  - regression-testing
  - flaky
related:
  - "[[RegressionTesting-Part02]]"
  - "[[RegressionTesting-Part04]]"
---

# RegressionTesting Specification (Part 03)

## Document Index

Part 01 - Purpose, Replay-Based Regression, and Capture
Part 02 - Bug-Replay Library and Fixture Lifecycle
Part 03 - Flaky Test Quarantine and Triage
Part 04 - CI Gates and Release Blocking

# Flaky Test Policy

A flaky test is a test that sometimes passes and sometimes fails for the same code. In a cheap-model-authored codebase, flakiness erodes trust in the whole suite.

Rules (aligned with [[TestingStrategy-Part04]]):

- on the first confirmed non-deterministic failure, the test MUST be moved to a `quarantine` suite,
- a quarantined test does not block merge but is reported in the CI summary,
- a quarantined test MUST be fixed within the sprint; it MUST NOT be permanently muted,
- the root cause is almost always: real time, real randomness, real network, shared state, or an unreset singleton.

# Triage

When a flake is found:

- identify which forbidden dependency (clock/random/network/shared state) is present,
- replace it with the corresponding fake (clock fake, seed, invoke fake, store reset),
- return the test to its proper layer once it passes 20 consecutive runs.

# AI Notes

Do not mute a flaky test with a retry loop that hides the failure; fix the determinism.

Do not share singletons across tests; reset stores and the EventBus in `beforeEach`.

# Related Documents

- [[TestingStrategy-Part04]]
- [[UnitTesting-Part04]]
