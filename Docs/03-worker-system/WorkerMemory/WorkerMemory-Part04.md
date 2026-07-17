---
title: WorkerMemory Specification - Part 04
status: draft
version: 1.0
tags:
  - worker-system
  - worker-memory
  - safety
related:
  - "[[WorkerMemory-Part03]]"
  - "[[PermissionManager-Part01]]"
---

# WorkerMemory Specification (Part 04)

## Document Index

Part 01 - Purpose, Scope, and Memory Model
Part 02 - Working Memory, Task Memory, and Summaries
Part 03 - Context Injection and Retrieval Rules
Part 04 - Retention, Redaction, and Safety
Part 05 - Events, UI, and Implementation Checklist

# Retention

Worker memory may be retained:

```text
until_worker_end
until_task_end
until_session_end
workspace_persistent_summary
manual_pin
```

# Redaction

Worker memory must redact:

- API keys
- tokens
- passwords
- SSH private key paths
- private user data
- sensitive environment values

# Safety Rules

Worker memory MUST NOT cross Workspace boundaries.

Sensitive Worker memory MUST NOT be injected into unrelated Workers.

Worker terminal logs SHOULD be summarized before reuse.

# AI Notes

Worker memory can accidentally contain secrets because terminals print things. Treat logs as sensitive until classified.

# Related Documents

- [[WorkerMemory-Part05]]
- [[PermissionManager-Part01]]

