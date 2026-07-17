---
title: UnitTesting Specification - Part 03
status: draft
version: 1.0
tags:
  - testing
  - unit-testing
  - rust
  - cargo-test
related:
  - "[[UnitTesting-Part02]]"
  - "[[UnitTesting-Part04]]"
---

# UnitTesting Specification (Part 03)

## Document Index

Part 01 - Scope, Tooling, and Mandatory Targets
Part 02 - Frontend Unit Policy (Vitest)
Part 03 - Rust Unit Policy (cargo test)
Part 04 - Coverage, Naming, and Review Rules

# Rust Unit Policy

Eulinx's Rust backend is thin by design (see [[12-development/README]] and the tech-stack discussion in ChatHistory). It is limited to PTY management, filesystem access, window/native APIs, IPC routing, and secure storage. Even so, every command MUST be tested because the backend is where unsafe operations and OS boundaries live.

## Command Tests

Each Tauri command body MUST be unit-tested with an in-memory filesystem fake and a temp directory. For every command:

- assert the success return shape,
- assert the typed error returned when the path is missing / locked / permission-denied,
- assert partial-failure handling (e.g. one of many files fails).

## PTY Tests

PTY management MUST be tested by spawning a trivial, cross-platform shell command (e.g. `echo`) and asserting:

- the process starts and the expected output is captured,
- writing to the PTY input reaches the child,
- termination signals the process and releases the handle,
- panics in a child do not crash the backend.

PTY tests MUST be marked to skip on environments without a usable shell (CI containers) and replaced by a mock PTY in those environments.

## Lock Manager and Merge Units

The algorithmic cores that live in Rust (lock acquisition, patch application, conflict detection) MUST have unit tests covering:

- exclusive vs shared lock semantics,
- upgrade/downgrade,
- deadlock-free ordering under contended acquisition,
- clean textual merge of non-overlapping patches and clean detection of overlapping patches.

## Determinism

Rust tests MUST use temp dirs, never the user's home. They MUST assert that temp artifacts are removed. Randomness (IDs, retries) MUST be seedable for tests.

# Related Documents

- [[IntegrationTesting-Part03]]
- [[UnitTesting-Part01]]
