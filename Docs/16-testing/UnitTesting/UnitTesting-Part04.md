---
title: UnitTesting Specification - Part 04
status: draft
version: 1.0
tags:
  - testing
  - unit-testing
  - coverage
related:
  - "[[UnitTesting-Part03]]"
  - "[[TestingStrategy-Part04]]"
---

# UnitTesting Specification (Part 04)

## Document Index

Part 01 - Scope, Tooling, and Mandatory Targets
Part 02 - Frontend Unit Policy (Vitest)
Part 03 - Rust Unit Policy (cargo test)
Part 04 - Coverage, Naming, and Review Rules

# Coverage Rules

- Frontend logic MUST maintain >= 80% line coverage; the gate fails below this.
- Runtime-critical modules (scheduler, merge, lock, permission, memory injection, cost math) MUST maintain >= 90%.
- Rust commands MUST have 100% of public entry points exercised by at least one test.
- Coverage is measured in the `ci` mode and reported as a build artifact.

# Naming Convention

Test names MUST express intent and use the layer-neutral verbs agreed in [[12-development/TestingRules/TestingRules-Part01]].

- Behaviour: `should_<do the thing>` — e.g. `should_acquire_exclusive_lock_when_free`.
- Error: `refuses_<blocked thing>` — e.g. `refuses_write_when_permission_missing`.
- Edge: `within_budget_<op>` for performance assertions that live at unit level.

# Review Rules

A unit test PR is reviewed for:

- isolation (no cross-test state),
- no real boundaries (invoke/network/FS) used directly,
- at least one failure-path assertion per success assertion for commands,
- determinism (no flaky sleeps).

# AI Notes

Do not assert on private internals; assert on observable state and emitted events.

Do not write a unit test that mounts the whole React tree; that belongs to e2e.

Do not raise the coverage threshold to pass a bad test; fix the test or the code.

# Related Documents

- [[TestingStrategy-Part04]]
- [[12-development/TestingRules/TestingRules-Part01]]
