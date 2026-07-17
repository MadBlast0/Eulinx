---
title: TemporaryMemory - Part 01
status: draft
version: 1.0
tags: [memory, temporary-memory]
related:
  - "[[MemoryArchitecture-Part01]]"
---

# TemporaryMemory - Part 01

## Document Index

Part 01 - Purpose, Lifetime, and Usage
Part 02 - Cleanup, Safety, and Implementation

# Purpose

TemporaryMemory stores short-lived context needed only during a Session, Execution, Task, or Worker run.

Examples:

- transient plan drafts
- intermediate tool outputs
- temporary summaries
- scratch notes
- routing hints

# Lifetime

TemporaryMemory should expire automatically.

Expiry modes:

```text
worker_end
task_end
execution_end
session_end
time_to_live
manual_clear
```

# AI Notes

Temporary memory should reduce repeated work, not become hidden long-term state.

