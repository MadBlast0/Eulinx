---
title: WorkspaceManager Specification - Part 04
status: draft
version: 1.0
tags:
  - runtime
  - workspace-manager
  - state
related:
  - "[[WorkspaceManager-Part01]]"
  - "[[EventBus-Part01]]"
---

# WorkspaceManager Specification (Part 04)

## Workspace State, Services, Events, and Persistence

Workspace state should be explicit and observable.

## WorkspaceRuntimeContext

```text
WorkspaceRuntimeContext
workspaceId
workspaceRoot
activeProjectId optional
databasePath
artifactRoot
memoryRoot
logRoot
settings
permissionPolicySetId
runtimeState
openedAt
```

## Workspace Events

WorkspaceManager SHOULD emit:

```text
workspace.discovered
workspace.opening
workspace.validated
workspace.opened
workspace.degraded
workspace.switch_requested
workspace.closing
workspace.closed
workspace.failed
workspace.recovering
workspace.recovered
workspace.path_denied
```

## Persistence

Workspace metadata SHOULD be stored in:

- a Workspace manifest file
- the Workspace database
- user-level recent Workspace registry

The manifest should contain stable identity and basic configuration. Runtime history belongs in the database.

## File Watchers

WorkspaceManager may own file watchers or delegate them to a FileManager service.

File watcher events MUST include Workspace id and Project id when available.

## Degraded State

A Workspace may become degraded when:

- database is temporarily unavailable
- file watcher fails
- memory index is missing
- artifact root is unavailable
- settings cannot be fully loaded

Degraded state SHOULD pause unsafe execution until resolved.

## AI Notes

Do not let downstream services silently continue after WorkspaceManager reports degraded state.

They should either pause, degrade gracefully, or explicitly mark their work blocked.

