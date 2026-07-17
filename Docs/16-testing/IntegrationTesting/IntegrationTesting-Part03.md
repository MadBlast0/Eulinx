---
title: IntegrationTesting Specification - Part 03
status: draft
version: 1.0
tags:
  - testing
  - integration-testing
  - eventbus
  - memory
related:
  - "[[IntegrationTesting-Part02]]"
  - "[[IntegrationTesting-Part04]]"
---

# IntegrationTesting Specification (Part 03)

## Document Index

Part 01 - Purpose, Seams, and Environment
Part 02 - Frontend ↔ IPC ↔ Rust Seams
Part 03 - Database, EventBus, and Memory Injection Seams
Part 04 - Workspace Isolation and Fixture Lifecycle

# Database Seam

Integration tests MUST run real migrations against a fresh temp SQLite DB and assert:

- schema version matches the migration count,
- a write via a Rust command is readable by a later query,
- a corrupted/partial migration is detected and surfaced rather than silently continuing.

# EventBus Seam

The EventBus (see [[02-runtime/EventBus/EventBus-Part01]] if present) MUST be tested for:

- publish ordering: subscribers receive events in emit order,
- fan-out: one event reaches all subscribers exactly once,
- late subscriber: an event published before subscription is NOT received (no replay unless explicitly a replay channel),
- error isolation: a throwing subscriber does not block others.

# Memory Injection Seam

The full injection pipeline MUST be exercised as one integration path:

- a Worker requests context scoped to its Task,
- scope filtering drops out-of-scope workspaces,
- permission filtering drops memories the Worker cannot read,
- redaction strips secrets,
- the resulting package is delivered to the Worker with the expected shape and size.

This is the single most security-relevant integration path and MUST have both a happy path and a refusal path.

# Related Documents

- [[04-memory/ContextInjection-Part01]]
- [[04-memory/MemoryRules-Part01]]
