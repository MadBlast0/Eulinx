---
title: WorkerPermissions Specification - Part 02
status: draft
version: 1.0
tags:
  - worker-system
  - worker-permissions
  - inheritance
related:
  - "[[WorkerPermissions-Part01]]"
  - "[[WorkerHierarchy-Part01]]"
---

# WorkerPermissions Specification (Part 02)

## Document Index

Part 01 - Purpose, Permission Profiles, and Modes
Part 02 - Grants, Inheritance, and Child Workers
Part 03 - Tool, Terminal, Filesystem, and Network Permissions
Part 04 - YOLO Mode, Approval Gates, and Revocation
Part 05 - Events, UI, and Implementation Checklist

# Grants

A Worker grant is a temporary capability assigned by Runtime.

```ts
type WorkerPermissionGrant = {
  id: string;
  workerId: string;
  permissionId: string;
  scopeType: string;
  scopeId: string;
  constraints: Record<string, unknown>;
  expiresAt?: string;
  grantedBy: string;
};
```

# Inheritance

Child Workers MUST NOT inherit all parent permissions automatically.

Inheritance should be:

- explicit
- narrowed
- task-specific
- budget-limited
- revocable

# Spawn Permission

When a Worker asks to spawn another Worker, the request should include requested permissions for the child.

Runtime may reduce or deny them.

# Permission Narrowing

Example:

```text
Parent can read src/**
Child task needs src/auth/**
Child receives src/auth/** only
```

# AI Notes

Never clone a parent Worker's full permission profile into a child Worker.

Child Workers should be least-privilege by default.

# Related Documents

- [[WorkerPermissions-Part03]]
- [[WorkerHierarchy-Part01]]
- [[Permission-Part06]]

