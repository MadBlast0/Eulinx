---
title: WorkerSandbox Specification - Part 02
status: draft
version: 1.0
tags:
  - worker-system
  - worker-sandbox
  - isolation
related:
  - "[[WorkerSandbox-Part01]]"
---

# WorkerSandbox Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and Sandbox Types
Part 02 - Filesystem, Process, Network, and Secret Isolation
Part 03 - Sandbox Lifecycle and Worker Binding
Part 04 - Patch Extraction, Artifact Flow, and Cleanup
Part 05 - Events, UI, and Implementation Checklist

# Filesystem Isolation

Filesystem sandboxing should restrict writes to sandbox paths unless explicitly approved.

# Process Isolation

Process isolation should track:

- parent process
- child processes
- command history
- working directory
- environment

# Network Isolation

Network may be:

```text
disabled
allowlisted
tool_only
unrestricted_with_audit
```

# Secret Isolation

Secrets should not be injected into sandbox unless required.

If injected, they should be scoped and temporary.

# AI Notes

A sandbox with unrestricted secrets and network is not much of a sandbox.

# Related Documents

- [[WorkerSandbox-Part03]]
- [[Permission-Part01]]

