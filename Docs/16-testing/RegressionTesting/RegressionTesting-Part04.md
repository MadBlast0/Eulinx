---
title: RegressionTesting Specification - Part 04
status: draft
version: 1.0
tags:
  - testing
  - regression-testing
  - ci
related:
  - "[[RegressionTesting-Part03]]"
  - "[[TestingStrategy-Part04]]"
---

# RegressionTesting Specification (Part 04)

## Document Index

Part 01 - Purpose, Replay-Based Regression, and Capture
Part 02 - Bug-Replay Library and Fixture Lifecycle
Part 03 - Flaky Test Quarantine and Triage
Part 04 - CI Gates and Release Blocking

# CI Gates

RegressionTesting is Gate 6 in the CI contract (see [[TestingStrategy-Part04]]):

- the bug-replay library replays; divergence fails the build,
- the performance baseline diff runs; a > 10% regression on a runtime-critical path blocks merge,
- the quarantine suite runs report-only and is surfaced in the summary.

Gate 7 (Playwright e2e) is release-blocking for tagged releases and report-only for feature branches when the shell build is unavailable.

# Release Blocking

A release tag MUST NOT be cut if:

- any regression replay is red,
- any quarantine test was silently muted,
- any performance baseline regression on a critical path was not deliberately accepted via reviewed commit.

# Audit

The regression library is an audit trail of what broke and what was defended. Each fixture links to its issue/ADR so future changes can reason about the cost of breaking it.

# AI Notes

Do not delete a regression fixture to make CI green; if behaviour legitimately changed, update the fixture in the same PR with a documented reason.

Do not let e2e be the only guard for a fixed bug; capture a fast replay-based regression too.

# Related Documents

- [[TestingStrategy-Part04]]
- [[RegressionTesting-Part01]]
- [[PerformanceTesting-Part04]]
