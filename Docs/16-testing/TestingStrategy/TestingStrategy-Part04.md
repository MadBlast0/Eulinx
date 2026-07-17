---
title: TestingStrategy Specification - Part 04
status: draft
version: 1.0
tags:
  - testing
  - testing-strategy
  - ci
related:
  - "[[TestingStrategy-Part03]]"
---

# TestingStrategy Specification (Part 04)

## Document Index

Part 01 - Philosophy, Test Pyramid, and Toolchain
Part 02 - Layer Responsibilities and What Is Tested Where
Part 03 - Test Environments, Fakes, and Fixtures
Part 04 - CI Gate Contract and Coverage Policy

# CI Gate Contract

The CI pipeline MUST run the layers in order and stop on first hard failure. The contract below is what [[12-development/README]] enforces.

- Gate 1 (Unit): Vitest unit + `cargo test`. Must be green. Blocking.
- Gate 2 (Integration): service ↔ IPC ↔ Rust seams. Must be green. Blocking.
- Gate 3 (Worker): replay-driven runtime tests. Must be green. Blocking.
- Gate 4 (Performance): budget assertions. Must be green within tolerance. Blocking.
- Gate 5 (Security): adversarial refusal tests. Must be green. Blocking.
- Gate 6 (Regression): replay of historical bugs. Must be green. Blocking.
- Gate 7 (E2E): Playwright on the built shell, per OS. Blocking for release tags; non-blocking (report-only) for feature branches if infrastructure is unavailable.

# Coverage Policy

- Frontend logic: >= 80% line coverage enforced as a hard gate.
- Runtime-critical paths (scheduler, merge, lock, permission, memory injection): >= 90% line coverage.
- Rust commands: every public command MUST have at least one success and one failure test.
- Uncovered lines on runtime-critical paths MUST be justified in the PR or the PR is rejected.

# Flaky Test Policy

- A test that fails non-deterministically MUST be moved to a `quarantine` suite after one confirmed flake.
- Quarantined tests MUST be fixed within the sprint; they MUST NOT be permanently muted.
- A quarantined test does not block merge but is reported in the CI summary.

# Pre-Merge Checklist

Every PR MUST include or update tests for the layer it touches. A pure-logic change with no unit test is not mergeable. A Rust command change with no `cargo test` is not mergeable. A permission change with no refusal test is not mergeable.

# Related Documents

- [[RegressionTesting-Part03]]
- [[12-development/TestingRules/TestingRules-Part01]]
- [[SecurityTesting-Part04]]
