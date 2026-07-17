---
title: TestingRules Specification - Part 02
status: draft
version: 1.0
tags:
  - development
  - testing-rules
related:
  - "[[12-development/README]]"
  - "[[TestingRules-Part01]]"
  - "[[TestingRules-Part03]]"
---

# TestingRules Specification (Part 02)

## Document Index

Part 01 - Testing Policy & What MUST Be Tested
Part 02 - Unit & Integration Testing
Part 03 - E2E, Performance & AI-Assisted Test Authoring

# Purpose

This part defines unit and integration testing specifics. These are the fast feedback layer the cheap model runs after every task.

# Unit Testing

- Unit tests isolate a single function or component with mocks for external boundaries.
- The Tauri `invoke` MUST be mocked in frontend unit tests; never call the real backend.
- React component tests MUST render with the real provider tree (theme, query) but mock services.
- Assert behavior and contract, not implementation internals, where reasonable.

# Integration Testing

- Integration tests verify collaboration between layers WITHOUT the real OS backend where possible: e.g. a service + store + mocked invoke together.
- A subset of integration tests MAY use the real Rust backend in a sandboxed temp workspace to validate the IPC contract end to end (PTY spawn, FS write). These run in CI, not in every local loop.
- Cross-boundary type drift (TS type vs Rust DTO) MUST be caught by a contract test that asserts shape parity.

# Test Naming

- Test descriptions MUST state the behavior and expected outcome: `spawnWorker rejects when permission denied`.
- Use the `describe`/`it` structure; group by module.

# Related Documents

- [[TestingRules-Part03]]
- [[ArchitectureRules-Part01]]
- [[FolderStructure-Part03]]
