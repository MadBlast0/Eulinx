---
title: WorkerSandbox Specification - Part 05
status: draft
version: 1.0
tags:
  - worker-system
  - worker-sandbox
  - implementation
related:
  - "[[WorkerSandbox-Part01]]"
---

# WorkerSandbox Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, and Sandbox Types
Part 02 - Filesystem, Process, Network, and Secret Isolation
Part 03 - Sandbox Lifecycle and Worker Binding
Part 04 - Patch Extraction, Artifact Flow, and Cleanup
Part 05 - Events, UI, and Implementation Checklist

# Events

```text
worker.sandbox.requested
worker.sandbox.created
worker.sandbox.bound
worker.sandbox.finalizing
worker.sandbox.patch_extracted
worker.sandbox.cleaned
worker.sandbox.failed
```

# UI

Worker UI should show:

- sandbox mode
- sandbox path
- files changed
- patch extracted
- cleanup state

# Implementation Checklist

```text
[ ] Define WorkerSandbox
[ ] Create sandbox root
[ ] Bind sandbox to Worker
[ ] Restrict write paths
[ ] Track process environment
[ ] Extract diff
[ ] Create patch artifact
[ ] Cleanup by retention policy
[ ] Add UI indicators
[ ] Add tests for path isolation
```

# Final AI Notes

WorkerSandbox is how Eulinx can be brave without being reckless.

# Related Documents

- [[WorkerSandbox-Part01]]
- [[WorkerPermissions-Part01]]

