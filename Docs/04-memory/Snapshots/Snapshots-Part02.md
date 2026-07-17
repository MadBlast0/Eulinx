---
title: Snapshots - Part 02
status: draft
version: 1.0
tags: [memory, snapshots, restore]
related:
  - "[[Snapshots-Part01]]"
---

# Snapshots - Part 02

## Document Index

Part 01 - Purpose, Snapshot Types, and Contents
Part 02 - Creation, Restore, and Safety
Part 03 - Implementation Checklist and Future Expansion

# Creation

Snapshots should be created before:

- high-risk merges
- large refactors
- destructive operations
- user-requested experiments

# Restore

Restore should be explicit and auditable.

Restore may require human approval.

# Safety

Do not restore across Workspace boundaries.

Do not overwrite newer user changes without warning.

