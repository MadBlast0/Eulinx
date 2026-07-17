---
title: WorkspaceManager Specification - Part 03
status: draft
version: 1.0
tags:
  - runtime
  - workspace-manager
  - isolation
related:
  - "[[WorkspaceManager-Part01]]"
  - "[[Permission-Part01]]"
  - "[[ExecutionEngine-Part07]]"
---

# WorkspaceManager Specification (Part 03)

## Project Isolation, File Boundaries, and Runtime Scope

The WorkspaceManager is responsible for making Workspace boundaries real at runtime.

## Boundary Types

Workspace boundaries include:

- file system roots
- database records
- memory indexes
- artifact stores
- Worker sessions
- terminal processes
- permission policies
- tool credentials
- event streams
- logs and replay history

## Path Validation

Every file path used by runtime services MUST be validated against the active Workspace.

Validation should normalize:

- relative paths
- absolute paths
- symlinks when possible
- case differences on Windows
- path traversal segments

The WorkspaceManager MUST reject paths that escape allowed roots.

## Project Scope

A Workspace may contain multiple Projects.

A Project is a smaller scope inside the Workspace. Runtime services SHOULD include both `workspaceId` and `projectId` when work is project-specific.

## Scope Diagram

```text
Workspace
  Project A
    Workers
    Tasks
    Artifacts
    Memory
  Project B
    Workers
    Tasks
    Artifacts
    Memory
```

## Cross-Project Access

Cross-project access MUST require explicit permission.

Example:

- Project A Worker reading Project B files should be denied by default.
- A KnowledgeBase import may read another Project only if approved.
- Marketplace export may package artifacts only from selected scope.

## AI Notes

Never assume "same machine" means "same Workspace."

Eulinx's safety depends on treating Workspace and Project ids as required runtime facts, not optional labels.

