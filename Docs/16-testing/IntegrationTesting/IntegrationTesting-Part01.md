---
title: IntegrationTesting Specification - Part 01
status: draft
version: 1.0
tags:
  - testing
  - integration-testing
related:
  - "[[16-testing/README]]"
  - "[[IntegrationTesting-Part02]]"
---

# IntegrationTesting Specification (Part 01)

## Document Index

Part 01 - Purpose, Seams, and Environment
Part 02 - Frontend ↔ IPC ↔ Rust Seams
Part 03 - Database, EventBus, and Memory Injection Seams
Part 04 - Workspace Isolation and Fixture Lifecycle

# Purpose

IntegrationTesting owns the seams between independently unit-tested modules. Unit tests prove a part works alone; integration tests prove the parts work wired together, without launching the full Tauri window for every case.

Eulinx's most expensive bugs live at seams, so integration coverage is non-negotiable.

# Seams Under Test

The integration layer MUST exercise these cross-module paths:

- Frontend service → Tauri command router → Rust command body (with a real router but stubbed OS side effects where unsafe).
- Rust command → SQLite (real temp DB, real migrations).
- EventBus publish from a service → subscription in another service, including ordering.
- Memory request → scope filter → permission filter → redaction → injected context package (see [[04-memory/ContextInjection-Part01]]).
- Artifact write → ArtifactManager → SQLite persistence → later read.

# Environment

Integration tests run in `ci` mode. They MAY use the real Tauri command router and a real temp SQLite DB, but MUST NOT open a WebView or spawn real model calls. The model provider is faked at the router boundary.

# Related Documents

- [[IntegrationTesting-Part02]]
- [[UnitTesting-Part01]]
- [[TestingStrategy-Part02]]
