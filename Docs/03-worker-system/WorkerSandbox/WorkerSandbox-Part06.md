---
title: WorkerSandbox Specification - Part 06
status: draft
version: 1.0
tags:
  - worker-system
  - worker-sandbox
  - future
related:
  - "[[WorkerSandbox-Part01]]"
---

# WorkerSandbox Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, and Sandbox Types
Part 02 - Filesystem, Process, Network, and Secret Isolation
Part 03 - Sandbox Lifecycle and Worker Binding
Part 04 - Patch Extraction, Artifact Flow, and Cleanup
Part 05 - Events, UI, and Implementation Checklist
Part 06 - Sandbox Anti-Patterns, Testing, and Future Expansion

# Anti-Patterns

Avoid:

- sandbox path equal to project root in YOLO mode
- unrestricted secrets inside sandbox
- copying sandbox files directly into project
- leaving sandbox folders forever
- treating sandbox as full security boundary when it is only directory isolation

# Testing

Tests should cover:

- write outside sandbox denied
- patch extraction works
- cleanup retention works
- secret injection denied by default
- process uses sandbox working directory

# Future Expansion

Future capabilities:

- container sandbox
- remote VM sandbox
- Git worktree sandbox
- snapshot and resume
- visual sandbox diff

# Final AI Notes

Sandboxing gives Workers a place to make mistakes before those mistakes touch the real project.

# Related Documents

- [[WorkerSandbox-Part01]]
- [[WorkerPermissions-Part01]]

