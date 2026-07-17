---
title: IntegrationTesting Specification - Part 04
status: draft
version: 1.0
tags:
  - testing
  - integration-testing
  - fixtures
related:
  - "[[IntegrationTesting-Part03]]"
  - "[[TestingStrategy-Part03]]"
---

# IntegrationTesting Specification (Part 04)

## Document Index

Part 01 - Purpose, Seams, and Environment
Part 02 - Frontend ↔ IPC ↔ Rust Seams
Part 03 - Database, EventBus, and Memory Injection Seams
Part 04 - Workspace Isolation and Fixture Lifecycle

# Workspace Isolation

Every integration test MUST run inside an isolated workspace fixture (temp SQLite + temp project folder). The test MUST assert that:

- writes stay inside the workspace,
- a Worker in workspace A cannot read workspace B's data,
- the temp project folder is removed on teardown.

# Fixture Lifecycle

- `beforeAll` creates the temp workspace and runs migrations once.
- `beforeEach` resets stores, the EventBus, and any in-memory caches.
- `afterEach` asserts no leaked timers or open handles.
- `afterAll` deletes the temp directory and asserts deletion.

# Determinism

Integration tests MUST use the clock fake and the model fake. They MAY use real SQLite and a real command router because those are deterministic given fixed input.

# AI Notes

Do not open a real Tauri window in integration tests; that is e2e territory and is far slower.

Do not share a workspace fixture across tests; isolation is the point of this layer.

# Related Documents

- [[TestingStrategy-Part03]]
- [[RegressionTesting-Part02]]
