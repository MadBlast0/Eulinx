---
title: Collaboration Specification - Part 01
status: draft
version: 1.0
tags:
  - features
  - collaboration
related:
  - "[[11-features/README]]"
  - "[[Collaboration-Part02]]"
  - "[[ArtifactManager-Part01]]"
---

# Collaboration Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and the Collaboration Model
Part 02 - Shared Workspaces and Sync
Part 03 - Artifact-Based Collaboration and Channels
Part 04 - Team Roles, Safety, and AI Notes

# Purpose

The Collaboration feature enables multiple users and agents to work in the same workspace. It is a later-phase, Pro capability built over encrypted sync — not a hosted multiplayer engine in v1. The foundation is artifact-based collaboration: humans and agents coordinate through shared Artifacts, tasks, and channels rather than simultaneous raw editing.

Collaboration reuses the Agent model: a human collaborator is, in many ways, another participant in the worker/channel system, with permissions and a context scope.

# Scope

In v1, collaboration is limited to shared workspaces over optional encrypted sync (Pro). End-to-end encrypted team collaboration servers are a non-goal for v1. Cross-device sync is opt-in and encrypted; a user can disable it and stay fully local.

# The Collaboration Model

Collaboration rests on:

- a shared workspace (same project folder, synced)
- shared tasks and artifacts
- shared channels (global and partitioned)
- per-participant permissions and roles
- an event stream every participant observes

# What Collaboration Owns

The collaboration feature owns:

- the shared-workspace and sync configuration UI
- the participant/role management surface
- the shared channel and presence surfaces
- the conflict-resolution UX for concurrent edits

It does NOT own the sync transport, the merge algorithm, or the permission engine; those are sync storage, MergeManager, and PermissionManager.

# Related Documents

- [[Collaboration-Part02]]
- [[ArtifactManager-Part01]]
