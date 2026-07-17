---
title: WorkerSandbox Specification - Part 03
status: draft
version: 1.0
tags:
  - worker-system
  - worker-sandbox
  - lifecycle
related:
  - "[[WorkerSandbox-Part02]]"
---

# WorkerSandbox Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, and Sandbox Types
Part 02 - Filesystem, Process, Network, and Secret Isolation
Part 03 - Sandbox Lifecycle and Worker Binding
Part 04 - Patch Extraction, Artifact Flow, and Cleanup
Part 05 - Events, UI, and Implementation Checklist

# Lifecycle

```text
requested
created
bound_to_worker
active
finalizing
archived
deleted
failed
```

# Binding

A sandbox should be bound to one Worker or one execution group.

The Runtime should know which Worker owns each sandbox.

# Expiry

Sandboxes may expire:

- when Worker ends
- when Task ends
- when Session ends
- after manual cleanup
- after retention period

# AI Notes

Do not leave sandbox folders forever without retention rules.

# Related Documents

- [[WorkerSandbox-Part04]]
- [[WorkerTermination-Part02]]

