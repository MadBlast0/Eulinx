---
title: UnitTesting Specification - Part 02
status: draft
version: 1.0
tags:
  - testing
  - unit-testing
  - vitest
related:
  - "[[UnitTesting-Part01]]"
  - "[[UnitTesting-Part03]]"
---

# UnitTesting Specification (Part 02)

## Document Index

Part 01 - Scope, Tooling, and Mandatory Targets
Part 02 - Frontend Unit Policy (Vitest)
Part 03 - Rust Unit Policy (cargo test)
Part 04 - Coverage, Naming, and Review Rules

# Frontend Unit Policy

The frontend is ~90–95% of Eulinx's code, so its unit policy is the most exercised rule in the repo.

## Store Testing

Zustand stores MUST be tested by calling actions and asserting resulting state. Because the store is a singleton, `beforeEach` MUST reset it to its initial state so tests cannot leak.

Things to assert:

- legal transitions move state as specified,
- illegal transitions are rejected or no-op as documented,
- selectors derive correctly from state,
- side effects (e.g. emitting through a faked EventBus) fire exactly once.

## Service Testing

A service test MUST inject the `invoke` fake and program it per case. For each command the service calls:

- assert the correct command name and payload are sent,
- assert the service maps a successful result into the expected domain object,
- assert the service maps a failure into the expected error state,
- assert retries/backoff behaviour when the fake is programmed to fail N times then succeed.

## Component Testing (Secondary)

When a component is unit tested, it MUST be rendered with a faked store and faked services. The test asserts user-visible behaviour (text, disabled state, emitted callback), never internal implementation. Snapshot tests are discouraged for layout-heavy components because they create noisy diffs; prefer behaviour assertions.

# Determinism Rules

- No `Date.now()` / `Math.random()` in code under test without a clock/seed fake.
- Async must be driven by the test's fake timers or by awaiting real promises that resolve in-process.
- No test may sleep for a fixed wall-clock duration to wait for behaviour; use fake timers or await the triggering event.

# Related Documents

- [[TestingStrategy-Part03]]
- [[UnitTesting-Part04]]
