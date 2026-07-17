---
title: Collaboration Specification - Part 02
status: draft
version: 1.0
tags:
  - features
  - collaboration
related:
  - "[[Collaboration-Part01]]"
  - "[[Collaboration-Part03]]"
---

# Collaboration Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and the Collaboration Model
Part 02 - Shared Workspaces and Sync
Part 03 - Artifact-Based Collaboration and Channels
Part 04 - Team Roles, Safety, and AI Notes

# Shared Workspaces

A Pro user can share a workspace with others. Sharing grants access to the project folder's synced state. Each participant operates within the same scope boundaries as a local user; the workspace remains isolated from other projects.

# Sync

Sync is encrypted object storage, opt-in, and cheap. It synchronizes the workspace state (files, artifacts, tasks, history, settings) across devices. The sync layer is a transport only; it does not change how execution or merging works.

# Presence

Participants see who is active, which workers are running, and which tasks are in flight. Presence is derived from the EventBus stream, not a separate realtime server bolted on.

# Related Documents

- [[Collaboration-Part03]]
