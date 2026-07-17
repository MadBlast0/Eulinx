---
title: LockManager Specification - Part 02
status: draft
version: 1.0
tags:
  - runtime
  - lock-manager
  - lock-types
related:
  - "[[LockManager-Part01]]"
---

# LockManager Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and Responsibilities
Part 02 - Lock Types, Ownership, and Scope
Part 03 - Acquisition, Release, Queues, and Timeouts
Part 04 - Deadlocks, Conflict Detection, and Recovery
Part 05 - Events, UI, Metrics, and Replay
Part 06 - Implementation Checklist and Future Expansion

# Lock Types

```text
read
write
exclusive
shared
intent
lease
advisory
hard
```

# Lock Object

```ts
type RuntimeLock = {
  id: string;
  workspaceId: string;
  resourceType: string;
  resourceId: string;
  mode: "read" | "write" | "exclusive" | "shared" | "intent";
  ownerType: "worker" | "tool" | "merge" | "runtime" | "user";
  ownerId: string;
  scopeType: string;
  scopeId: string;
  expiresAt?: string;
  createdAt: string;
};
```

# Ownership

Every lock MUST have an owner.

Owners may be:

- Worker
- Merge operation
- Tool invocation
- Runtime service
- User action

# Scope

Locks should be scoped to Workspace.

Locks MUST NOT cross Workspaces unless the resource itself is global and explicitly designed that way.

# Symbol Locks

Symbol locks are future-oriented but important.

They allow two Workers to edit different functions in the same file.

Early versions may start with file locks and add symbol locks later.

# AI Notes

Start simple with file and terminal locks, but design the type system so symbol locks can be added later.

# Related Documents

- [[LockManager-Part03]]
- [[MergeManager-Part04]]

