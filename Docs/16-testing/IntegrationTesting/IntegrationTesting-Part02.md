---
title: IntegrationTesting Specification - Part 02
status: draft
version: 1.0
tags:
  - testing
  - integration-testing
  - ipc
related:
  - "[[IntegrationTesting-Part01]]"
  - "[[IntegrationTesting-Part03]]"
---

# IntegrationTesting Specification (Part 02)

## Document Index

Part 01 - Purpose, Seams, and Environment
Part 02 - Frontend ↔ IPC ↔ Rust Seams
Part 03 - Database, EventBus, and Memory Injection Seams
Part 04 - Workspace Isolation and Fixture Lifecycle

# Frontend ↔ IPC ↔ Rust

This seam is the heart of Eulinx's architecture: UI → service → `invoke` → Rust command. Integration tests wire a real service to a real command router and assert end to end at the module boundary.

Cases to cover:

- a service issues a command; the Rust command runs, persists to temp SQLite, and returns; the service updates its store.
- the Rust command fails (e.g. locked file); the error propagates as a typed domain error into the store, not as an untyped exception.
- streaming: a command emits multiple chunks; the service exposes them in order through TanStack Query or a store.
- a command that should be denied by permission is rejected before the OS call, returning a permission error.

# Rust ↔ Filesystem and PTY

Where safe in CI, integration tests spawn a real PTY for a benign command and assert capture; where a shell is unavailable, a mock PTY stands in. File operations go to a temp project folder that is destroyed after the test.

# Related Documents

- [[UnitTesting-Part03]]
- [[SecurityTesting-Part02]]
