---
title: TestingStrategy Specification - Part 03
status: draft
version: 1.0
tags:
  - testing
  - testing-strategy
  - fixtures
related:
  - "[[TestingStrategy-Part02]]"
  - "[[TestingStrategy-Part04]]"
---

# TestingStrategy Specification (Part 03)

## Document Index

Part 01 - Philosophy, Test Pyramid, and Toolchain
Part 02 - Layer Responsibilities and What Is Tested Where
Part 03 - Test Environments, Fakes, and Fixtures
Part 04 - CI Gate Contract and Coverage Policy

# Test Environments

Eulinx MUST support three execution modes so the same test can run fast locally and thoroughly in CI.

- `local` — runs only unit + fast integration, no Tauri shell, no network.
- `ci` — runs unit + integration + worker + performance + security gates, headless.
- `e2e` — builds the Tauri app and drives it with Playwright on each target OS.

# Fakes and Seams

The single most important design rule for testability: the UI never calls `invoke` directly; it calls a service. That seam is the injection point for fakes.

Mandatory fakes:

- `invoke` bridge fake — returns canned command results keyed by command name; can be programmed to fail for a given command to exercise error paths.
- Model/Provider fake — yields scripted streaming chunks so Worker tests never call a real API.
- Filesystem fake for Rust — an in-memory FS used by `cargo test` so backend tests leave no traces.
- Clock fake — a controllable time source for schedules, timeouts, and retry backoff.
- EventBus fake — a synchronous in-process bus for unit/integration; the real async bus only in e2e.

# Fixtures

Reusable fixtures MUST live in a shared test fixtures module, not copied per test.

- `workspaceFixture` — an isolated workspace with a temp SQLite DB and temp project folder.
- `workerFixture` — a Worker in a given lifecycle state with seeded memory and permissions.
- `artifactFixture` — a sample artifact (patch, code, markdown, json) for merge/verify tests.
- `replayFixture` — a recorded runtime session used by Worker and Regression tests.
- `permissionFixture` — a permission set used by security refusal tests.

# Isolation Rules

- Each test MUST start from a clean fixture; no test may read another test's state.
- Vitest MUST run with `isolate: true`; modules with singletons (Zustand stores, EventBus) MUST be reset in `beforeEach`.
- `cargo test` MUST use temp directories under the system temp path and assert cleanup.

# Related Documents

- [[UnitTesting-Part02]]
- [[IntegrationTesting-Part02]]
- [[WorkerTesting-Part02]]
