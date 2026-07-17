---
title: UnitTesting Specification - Part 01
status: draft
version: 1.0
tags:
  - testing
  - unit-testing
  - vitest
related:
  - "[[16-testing/README]]"
  - "[[UnitTesting-Part02]]"
  - "[[12-development/TestingRules/TestingRules-Part01]]"
---

# UnitTesting Specification (Part 01)

## Document Index

Part 01 - Scope, Tooling, and Mandatory Targets
Part 02 - Frontend Unit Policy (Vitest)
Part 03 - Rust Unit Policy (cargo test)
Part 04 - Coverage, Naming, and Review Rules

# Purpose

UnitTesting defines the base of the pyramid: the fastest, most numerous, most isolated tests in Eulinx.

Unit tests MUST own confidence in pure logic and single-module behaviour. They MUST NOT require a Tauri window, a real model API, a real filesystem, or the network.

# Scope of Unit Testing

A unit test in Eulinx covers exactly one module in isolation, with every dependency that crosses a process or async boundary replaced by a fake.

Must-have unit coverage:

- Zustand stores: every reducer/action and selector, including illegal transitions.
- Services: every command the service can issue through the `invoke` fake, success and failure.
- Pure runtime algorithms: merge conflict resolution, lock acquisition/release, artifact patch application, prompt templating, refinement stopping rule, cost/token math, permission evaluation.
- Rust commands: the command body and its error mapping, with an in-memory FS.

# Tooling

- Frontend: `Vitest` with `environment: node` for services/stores and `environment: jsdom` (or `happy-dom`) for components that read layout. Component unit tests are allowed but secondary; prefer testing the store the component binds to.
- Rust: `cargo test` per crate; integration tests in `tests/` for command routers; unit tests inline with `#[cfg(test)]`.

# Mandatory Targets

- Every exported pure function in `src/utils`, `src/services`, and `src/stores` MUST have at least one test.
- Every Rust command MUST have a `cargo test` for the happy path and one for a failure path.
- No unit test file MAY import the real Tauri `invoke`.

# Related Documents

- [[UnitTesting-Part02]]
- [[TestingStrategy-Part03]]
- [[IntegrationTesting-Part01]]
