---
title: TestingRules Specification - Part 01
status: draft
version: 1.0
tags:
  - development
  - testing-rules
related:
  - "[[12-development/README]]"
  - "[[TestingRules-Part02]]"
  - "[[TestingRules-Part03]]"
---

# TestingRules Specification (Part 01)

## Document Index

Part 01 - Testing Policy & What MUST Be Tested
Part 02 - Unit & Integration Testing
Part 03 - E2E, Performance & AI-Assisted Test Authoring

# Purpose

TestingRules defines the testing policy for Eulinx. Tests are the safety net that lets the cheap coding model iterate quickly without silently breaking the architecture. The policy favors fast, isolated tests and forbids shipping untested core logic.

# Testing Stack

- Frontend unit/integration: Vitest.
- Rust unit: `cargo test`.
- End-to-end: Playwright (drives the built Tauri app or the web preview).
- Component testing: Vitest + Testing Library for critical interactive components.

# What MUST Be Tested

- Services layer: every `invoke` wrapper MUST have a test asserting correct command name, payload shape, and error mapping.
- Stores (Zustand): state transitions and selectors MUST be tested.
- Pure utilities: 100% of non-trivial helpers (date, string, clone, id, debounce) MUST be tested.
- Rust managers: PTY lifecycle, FS operations, secure-store read/write MUST have unit tests.
- Core domain logic: worker spawn/terminate state machine, artifact merge coordination, lock acquisition, permission checks.

# Coverage Expectation

Eulinx enforces hard coverage gates in CI, declared authoritatively by [[16-testing/README]] and [[TestingStrategy-Part04]] / [[UnitTesting-Part04]]:

- Frontend logic MUST maintain >= 80% line coverage; the gate fails below this.
- Runtime-critical modules (scheduler, merge, lock, permission, memory injection, cost math) MUST maintain >= 90% line coverage; the gate fails below this.
- Rust commands MUST have 100% of public entry points exercised by at least one test.

Every bug fix MUST ship with a regression test. The cheap model MUST be directed to add tests for new logic per the "small focused tasks" policy.

# Test Discipline

Tests MUST be deterministic (no flaky timers, no real network by default). Time and randomness MUST be injectable. Tests MUST be colocated with source as `*.test.ts(x)`.

# Related Documents

- [[TestingRules-Part02]]
- [[CodingStandards-Part04]]
- [[AIInstructions-Part02]]
