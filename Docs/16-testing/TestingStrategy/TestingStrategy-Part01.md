---
title: TestingStrategy Specification - Part 01
status: draft
version: 1.0
tags:
  - testing
  - testing-strategy
  - flow:P00-TESTS
related:
  - "[[16-testing/README]]"
  - "[[TestingStrategy-Part02]]"
  - "[[12-development/TestingRules/TestingRules-Part01]]"
---

# TestingStrategy Specification (Part 01)

## Document Index

Part 01 - Philosophy, Test Pyramid, and Toolchain
Part 02 - Layer Responsibilities and What Is Tested Where
Part 03 - Test Environments, Fakes, and Fixtures
Part 04 - CI Gate Contract and Coverage Policy

# Purpose

TestingStrategy defines WHY Eulinx tests the way it does and WHERE each kind of test belongs.

It is the umbrella policy for the entire `16-testing` section. The other topic folders are specializations of this strategy.

# Philosophy

Eulinx is authored mostly by a cheaper coding model. That model is good at small, focused tasks but weaker at holding the whole system in context. Tests are the cheap model's safety net: they turn "does this still work" into a command, not a question.

Three beliefs drive this strategy:

- Fast feedback beats exhaustive feedback. A unit test that runs in milliseconds is worth more than an e2e test that runs in minutes, for the same confidence on that path.
- Determinism beats realism. A test that reproduces a bug every time is more valuable than one that reproduces it only on Tuesdays.
- Boundaries are where bugs live. Most Eulinx defects occur at the seams: frontend service ↔ Tauri IPC, IPC ↔ Rust command, Rust ↔ filesystem, Worker ↔ Memory, Plugin ↔ host. Tests MUST concentrate on those seams.

# The Test Pyramid

Eulinx uses a pyramid, not a cone. The wide base is unit tests; the narrow tip is e2e.

```text
        E2E (Playwright, few, slow, real shell)
       /                                          \
      Regression (replay gates, CI-blocking)
     /              Security (adversarial)              \
    /                Performance (budgets)                \
   /                      Worker (replay + sandbox)          \
  /                          Integration (services+IPC+Rust)    \
 /                                    Unit (Vitest + cargo test)   \
-------------------------------------------------------------------
```

# Canonical Toolchain

The testing stack is fixed and MUST NOT diverge per feature.

- Frontend unit and integration: `Vitest` with `jsdom` or `happy-dom` for DOM-bound modules, and a pure-node environment for services and stores.
- Rust unit and integration: `cargo test` for every command and backend module.
- End-to-end: `Playwright` driving the built Tauri application on Windows, macOS, and Linux.
- Benchmarking: a stable in-repo harness (Vitest `bench` for TS; `criterion`-style `cargo bench` for Rust) gated by budget assertions.
- Replay fixtures: recorded runtime sessions stored as artifacts (see [[04-memory/Replay/Replay-Part01]]) reused by Worker and Regression tests.

# Relationship to Development Rules

This strategy is enforced by the rules in [[12-development/TestingRules/TestingRules-Part01]]. Where the two disagree, the development rules define the CI enforcement and this strategy defines the intent.

# Related Documents

- [[TestingStrategy-Part02]]
- [[UnitTesting-Part01]]
- [[IntegrationTesting-Part01]]
- [[12-development/README]]
