---
title: Permission Manager Part 04 - Runtime Enforcement
status: draft
version: 1.0
tags:
  - runtime
  - permission-manager
  - enforcement
related:
  - "[[Worker-Part01]]"
  - "[[ToolRegistry-Part01]]"
  - "[[ProcessLifecycle-Part01]]"
  - "[[WorkspaceManager-Part01]]"
---

# Permission Manager Part 04 - Runtime Enforcement

## Purpose

This part defines where permission decisions are enforced. PermissionManager decides; calling runtime services enforce.

## Enforcement Points

Permission checks MUST happen before:

- spawning a Worker
- opening a terminal
- running a shell command
- invoking a Tool
- invoking an MCP tool
- reading or writing files
- deleting files
- creating patches
- applying patches
- accessing memory
- accessing secrets
- browsing the web
- using Git
- installing plugins
- sending network requests

## Worker Enforcement

Workers MAY request permissions, but WorkerSpawner and ProcessLifecycle enforce them.

```text
Worker asks to spawn child
  |
  v
WorkerSpawner asks PermissionManager
  |
  v
Decision
  |
  +-- allow -> create child Worker
  +-- deny -> report permission denied
  +-- approval -> wait for user
```

## Tool Enforcement

ToolRegistry MUST check permission before invoking any tool. Tool definitions should declare required capabilities:

```text
toolId: filesystem.write
requiredActions:
  - filesystem.read
  - filesystem.write
resourceTypes:
  - file
```

## Workspace Enforcement

WorkspaceManager MUST enforce path boundaries even if PermissionManager allows a filesystem action. Permission does not override workspace isolation.

## Merge Enforcement

MergeManager MUST request permission before applying changes to trusted project files. It also MUST check LockManager and verification status.

## AI Notes

Do not put permission enforcement only in UI buttons. Workers, tools, plugins, and terminals can operate without clicking UI. Enforcement belongs in runtime services.

## Implementation Checklist

```text
[ ] Add permission checks to WorkerSpawner
[ ] Add permission checks to ProcessLifecycle
[ ] Add permission checks to ToolRegistry
[ ] Add permission checks to WorkspaceManager
[ ] Add permission checks to MergeManager
[ ] Add permission checks to MemoryManager
[ ] Add tests that bypass UI and still get denied
```

