---
title: WorkspaceManager Specification - Part 05
status: draft
version: 1.0
tags:
  - runtime
  - workspace-manager
  - recovery
related:
  - "[[Snapshots]]"
  - "[[Replay]]"
  - "[[WorkspaceManager-Part01]]"
---

# WorkspaceManager Specification (Part 05)

## Safety, Recovery, Snapshots, and Migration

WorkspaceManager is a safety-critical service because it controls the environment in which all runtime work happens.

## Recovery Goals

After a crash, Eulinx should be able to answer:

- which Workspace was active
- which Project was active
- which executions were running
- which Workers existed
- which locks were held
- which artifacts were produced
- whether any merge was in progress

## Startup Recovery

On startup, WorkspaceManager SHOULD:

- detect last active Workspace
- verify Workspace still exists
- inspect incomplete runtime records
- mark stale executions as interrupted
- release stale locks only after safety checks
- restore file watchers
- rebuild missing indexes when required

## Snapshots

Snapshots capture Workspace state at a point in time.

WorkspaceManager SHOULD coordinate snapshot creation with:

- RuntimeManager
- ArtifactManager
- MemoryManager
- MergeManager
- database layer

Snapshot creation SHOULD pause unsafe writes or use a consistent database transaction strategy.

## Migration

Workspace schema migration MUST be versioned.

Migration SHOULD:

- backup important metadata first
- run inside a transaction when possible
- log migration steps
- support failure reporting
- avoid modifying project source files unless the migration explicitly requires it

## AI Notes

Do not implement recovery as "just reopen the folder."

Recovery is about reconstructing runtime truth, not merely loading files.

