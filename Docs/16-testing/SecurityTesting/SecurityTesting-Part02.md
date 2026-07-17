---
title: SecurityTesting Specification - Part 02
status: draft
version: 1.0
tags:
  - testing
  - security-testing
  - permission
related:
  - "[[SecurityTesting-Part01]]"
  - "[[SecurityTesting-Part03]]"
---

# SecurityTesting Specification (Part 02)

## Document Index

Part 01 - Threat Model and Refusal-First Policy
Part 02 - Sandbox and Permission Testing
Part 03 - Plugin Boundary Testing
Part 04 - Secrets, Redaction, and Adversarial Input

# Sandbox Testing

Workers execute in sandboxes and produce artifacts, never editing the workspace directly (per ChatHistory and [[02-runtime/MergeManager-Part01]]). Tests MUST assert:

- a Worker cannot write outside its sandbox before merge,
- a Worker cannot read a file outside its granted scope,
- path-traversal inputs (`../`) are normalized and refused,
- symlink escapes are detected and blocked,
- a sandbox is destroyed on Worker termination with no residue in the workspace.

# Permission Testing

PermissionManager (per [[02-runtime/PermissionManager-Part01]]) MUST be tested per capability with the refusal-first pairs described in Part 01. Additionally:

- a Worker with `Auto Approve` off still requires human gate for destructive actions,
- `YOLO Mode` is an explicit, logged, revocable override and is never the default,
- permission changes mid-run take effect on the next action, not retroactively,
- a denied action emits a security event, not a silent no-op.

# Lock Manager Security

Lock Manager (per [[02-runtime/LockManager-Part01]]) MUST be tested so that no two Workers ever hold the same exclusive lock, even under contention injected by chaos tests (see [[WorkerTesting-Part05]]).

# Related Documents

- [[02-runtime/PermissionManager-Part01]]
- [[03-worker-system/WorkerSandbox-Part01]]
