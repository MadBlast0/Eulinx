---
title: WorkerSandbox Specification - Part 01
status: draft
version: 1.0
tags:
  - worker-system
  - worker-sandbox
  - isolation
related:
  - "[[WorkerPermissions-Part01]]"
  - "[[WorkspaceManager-Part01]]"
---

# WorkerSandbox Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, and Sandbox Types
Part 02 - Filesystem, Process, Network, and Secret Isolation
Part 03 - Sandbox Lifecycle and Worker Binding
Part 04 - Patch Extraction, Artifact Flow, and Cleanup
Part 05 - Events, UI, and Implementation Checklist

# Purpose

WorkerSandbox defines how Eulinx isolates Worker execution from the real project and machine.

Sandboxes allow Workers to explore, test, and modify safely before changes are verified and merged.

# Philosophy

Workers should have room to work without being able to accidentally damage the project.

Sandboxing is especially important for YOLO mode.

# Sandbox Types

```text
none
working_directory_only
project_copy
git_worktree
temporary_directory
container
remote_vm
```

Early Eulinx may start with working-directory and temporary-directory sandboxing, then grow toward stronger isolation.

# Sandbox Object

```ts
type WorkerSandbox = {
  id: string;
  workerId: string;
  workspaceId: string;
  type: string;
  rootPath: string;
  createdAt: string;
  expiresAt?: string;
};
```

# AI Notes

Sandboxing is not optional polish. It is how Eulinx can safely allow faster Worker execution.

# Related Documents

- [[WorkerSandbox-Part02]]
- [[WorkerPermissions-Part01]]

