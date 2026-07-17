---
title: WorkerPermissions Specification - Part 06
status: draft
version: 1.0
tags:
  - worker-system
  - worker-permissions
  - future
related:
  - "[[WorkerPermissions-Part01]]"
---

# WorkerPermissions Specification (Part 06)

## Document Index

Part 01 - Purpose, Permission Profiles, and Modes
Part 02 - Grants, Inheritance, and Child Workers
Part 03 - Tool, Terminal, Filesystem, and Network Permissions
Part 04 - YOLO Mode, Approval Gates, and Revocation
Part 05 - Events, UI, and Implementation Checklist
Part 06 - Permission Anti-Patterns, Testing, and Future Expansion

# Anti-Patterns

Avoid:

- full parent permission inheritance
- permanent Worker grants
- permission checks only in UI
- YOLO as unchecked access
- child Workers with broader power than parent

# Testing

Tests should cover:

- denied unknown permission
- child permission narrowing
- revocation during execution
- terminal permission denial
- YOLO hard-denial enforcement

# Future Expansion

Future features:

- visual permission diff
- policy suggestions
- per-Worker risk score
- temporary delegated approvals

# Final AI Notes

WorkerPermissions is where the app proves that powerful AI terminals can still be controlled.

# Related Documents

- [[WorkerPermissions-Part01]]
- [[Permission-Part01]]

