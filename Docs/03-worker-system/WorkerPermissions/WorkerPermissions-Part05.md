---
title: WorkerPermissions Specification - Part 05
status: draft
version: 1.0
tags:
  - worker-system
  - worker-permissions
  - implementation
related:
  - "[[WorkerPermissions-Part01]]"
---

# WorkerPermissions Specification (Part 05)

## Document Index

Part 01 - Purpose, Permission Profiles, and Modes
Part 02 - Grants, Inheritance, and Child Workers
Part 03 - Tool, Terminal, Filesystem, and Network Permissions
Part 04 - YOLO Mode, Approval Gates, and Revocation
Part 05 - Events, UI, and Implementation Checklist

# Events

```text
worker.permission.profile_assigned
worker.permission.granted
worker.permission.denied
worker.permission.approval_required
worker.permission.revoked
worker.permission.violation
```

# UI

Worker UI should show:

- permission mode
- active grants
- denied actions
- pending approvals
- YOLO indicator
- revocation controls

# Implementation Checklist

```text
[ ] Define WorkerPermissionProfile
[ ] Define WorkerPermissionGrant
[ ] Add grant calculation
[ ] Add child permission narrowing
[ ] Add terminal permission checks
[ ] Add tool permission checks
[ ] Add YOLO policy bundle
[ ] Add revocation flow
[ ] Add UI indicators
[ ] Add tests for child inheritance
```

# Final AI Notes

WorkerPermissions is what lets Eulinx run powerful terminal Workers without treating them as fully trusted users.

# Related Documents

- [[WorkerPermissions-Part01]]
- [[Permission-Part01]]
- [[PermissionManager-Part01]]

