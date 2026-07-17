---
title: LockManager Specification - Part 05
status: draft
version: 1.0
tags:
  - runtime
  - lock-manager
  - events
  - metrics
related:
  - "[[LockManager-Part04]]"
  - "[[Workflow-Part11]]"
---

# LockManager Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, and Responsibilities
Part 02 - Lock Types, Ownership, and Scope
Part 03 - Acquisition, Release, Queues, and Timeouts
Part 04 - Deadlocks, Conflict Detection, and Recovery
Part 05 - Events, UI, Metrics, and Replay
Part 06 - Implementation Checklist and Future Expansion

# Events

```text
lock.requested
lock.granted
lock.queued
lock.released
lock.expired
lock.denied
lock.deadlock_detected
lock.force_release_requested
```

# Metrics

LockManager SHOULD track:

- active locks
- lock wait time
- lock conflict count
- stale lock count
- deadlock count
- forced release count

# UI

The UI should show lock blockers in plain language.

Example:

```text
Merge is waiting because Worker 4 is editing src/auth.ts.
```

# Replay

Replay should show when locks blocked or allowed project mutation.

# AI Notes

Locks are invisible until they block something. Make blockers visible in the UI.

# Related Documents

- [[LockManager-Part06]]
- [[Workflow-Part11]]

