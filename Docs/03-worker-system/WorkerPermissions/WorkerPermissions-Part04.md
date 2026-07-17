---
title: WorkerPermissions Specification - Part 04
status: draft
version: 1.0
tags:
  - worker-system
  - worker-permissions
  - yolo
  - approvals
related:
  - "[[Permission-Part04]]"
  - "[[WorkerSandbox-Part01]]"
---

# WorkerPermissions Specification (Part 04)

## Document Index

Part 01 - Purpose, Permission Profiles, and Modes
Part 02 - Grants, Inheritance, and Child Workers
Part 03 - Tool, Terminal, Filesystem, and Network Permissions
Part 04 - YOLO Mode, Approval Gates, and Revocation
Part 05 - Events, UI, and Implementation Checklist

# YOLO Mode

YOLO mode reduces approval prompts but does not remove Runtime boundaries.

YOLO Workers MUST still respect:

- Workspace boundaries
- hard denials
- secret protection
- budget limits
- lock rules
- audit logs

# Approval Gates

Approval should still be required for:

- secret access
- external folder access
- Git push
- destructive file deletes
- plugin installation
- network upload of project files

# Revocation

Worker permissions may be revoked when:

- user revokes them
- Worker completes
- Task completes
- Session ends
- policy changes
- violation occurs
- budget expires

# Revocation Effects

Revocation should:

- block new actions
- cancel pending approvals
- pause or stop Worker if needed
- emit event
- update UI

# AI Notes

YOLO is a policy bundle, not a bypass.

Do not implement YOLO as "skip permission checks."

# Related Documents

- [[WorkerPermissions-Part05]]
- [[Permission-Part04]]
- [[WorkerSandbox-Part01]]

