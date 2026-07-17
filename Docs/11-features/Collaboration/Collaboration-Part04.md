---
title: Collaboration Specification - Part 04
status: draft
version: 1.0
tags:
  - features
  - collaboration
related:
  - "[[Collaboration-Part03]]"
  - "[[PermissionManager-Part01]]"
---

# Collaboration Specification (Part 04)

## Document Index

Part 01 - Purpose, Scope, and the Collaboration Model
Part 02 - Shared Workspaces and Sync
Part 03 - Artifact-Based Collaboration and Channels
Part 04 - Team Roles, Safety, and AI Notes

# Team Roles

Participants have roles that map to permission sets: owner, editor, reviewer, viewer. Roles are enforced by the PermissionManager. A viewer can read channels and artifacts but cannot propose merges; an editor can propose; a reviewer can approve merges; an owner manages sharing and roles.

# Safety

Collaboration MUST NOT lower the safety rails of single-user mode. Every authority-bearing action by a participant or their agents still passes through PermissionManager. Destructive actions (push, delete, publish) require approval gates regardless of role.

# Privacy

Sync is encrypted; a participant sees only workspaces shared with them. A user who disables sync stays fully local and loses only cross-device sharing, not any core capability.

# AI Notes

Do not build a separate realtime collaboration server in v1; reuse sync + EventBus + Artifacts.

Do not let concurrent human edits bypass the Artifact/Merge path; that is what prevents conflicts.

Do not weaken permission gating for "trusted" teammates; roles are enforced like any grant.

Do not assume a human participant edits the tree directly; they propose Artifacts like agents.

# Related Documents

- [[PermissionManager-Part01]]
