---
title: LockManager Specification - Part 04
status: draft
version: 1.0
tags:
  - runtime
  - lock-manager
  - deadlocks
related:
  - "[[LockManager-Part03]]"
---

# LockManager Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, and Responsibilities
Part 02 - Lock Types, Ownership, and Scope
Part 03 - Acquisition, Release, Queues, and Timeouts
Part 04 - Deadlocks, Conflict Detection, and Recovery
Part 05 - Events, UI, Metrics, and Replay
Part 06 - Implementation Checklist and Future Expansion

# Deadlocks

A deadlock occurs when two or more operations wait on each other's locks.

Example:

```text
Merge A holds file1, waits for file2.
Merge B holds file2, waits for file1.
```

# Prevention

Eulinx SHOULD prevent deadlocks by:

- acquiring locks in stable order
- using batch lock acquisition
- using timeouts
- avoiding nested lock requests
- detecting wait cycles

# Conflict Detection

Conflicts may be:

- file conflict
- symbol conflict
- terminal ownership conflict
- merge conflict
- workflow graph mutation conflict

# Recovery

Recovery strategies:

```text
wait
cancel lower priority
retry later
ask user
rollback owner
force release only after safe termination
```

# AI Notes

Do not acquire locks one by one for multi-file merges if batch acquisition is possible.

Stable lock ordering prevents many deadlocks.

# Related Documents

- [[LockManager-Part05]]
- [[MergeManager-Part05]]

