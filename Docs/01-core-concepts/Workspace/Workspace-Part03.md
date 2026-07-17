---
title: Workspace Specification - Part 03
status: draft
version: 1.0
tags:
  - core-concepts
  - workspace
related:
  - "[[01-core-concepts/README]]"
  - "[[Workspace-Part01]]"
  - "[[Workspace-Part02]]"
  - "[[Workspace-Diagrams]]"
  - "[[WorkspaceManager-Part01]]"
  - "[[WorkspaceMemory-Part01]]"
  - "[[07-ui-ux/WorkspaceLayout/WorkspaceLayout-Part01]]"
---

# Workspace Specification (Part 03)

## Document Index

Part 01 — Purpose, Definition, Boundaries, and What a Workspace Owns
Part 02 — Workspace Lifecycle: Creation, Switching, Persistence, Isolation
Part 03 — Workspace in the Runtime: WorkspaceManager, WorkspaceMemory, WorkspaceLayout
Diagrams — Workspace-Diagrams.md

---

# Purpose

This part shows how the Workspace concept is realized at runtime by three cooperating subsystems: WorkspaceManager, WorkspaceMemory, and WorkspaceLayout.

---

# WorkspaceManager

The [[WorkspaceManager-Part01]] is the runtime service that binds Eulinx's runtime to the user's selected Workspace.

It owns:

- active Workspace identity
- Workspace open and close lifecycle
- Workspace file roots
- Workspace database connection
- Workspace runtime binding
- Workspace settings
- Workspace health and isolation checks
- Workspace-level events

WorkspaceManager answers: "which Workspace is active, and is everything operating inside its boundary?"

---

# WorkspaceMemory

[[WorkspaceMemory-Part01]] stores durable facts about one Workspace.

It is scoped to a single Workspace and MUST NOT cross Workspace boundaries. It holds architecture decisions, coding conventions, user preferences, project rules, and important artifact references.

WorkspaceMemory answers: "what stable context does this Workspace carry forward for future Sessions and Workers?"

---

# WorkspaceLayout

[[07-ui-ux/WorkspaceLayout/WorkspaceLayout-Part01]] owns the Eulinx window and its region model.

Crucially, layout is per Workspace, keyed by `workspaceId`. Each Workspace stores its own layout blob, loaded on activation and saved on change. The backend persists the layout as opaque bytes; it never interprets it.

WorkspaceLayout answers: "how is the window divided for this Workspace, and where does each surface live?"

---

# How They Relate

```text
User selects folder
        |
        v
WorkspaceManager  (opens, binds, enforces boundary)
        |
        +-- WorkspaceMemory   (scoped durable context per Workspace)
        |
        +-- WorkspaceLayout   (per-workspaceId window layout blob)
        |
        +-- Runtime services  (Sessions, Workers, Artifacts, Tasks)
        |       all scoped to the active Workspace
        |
        +-- Projects          (units of work inside the Workspace)
```

The Workspace is the boundary. WorkspaceManager enforces the boundary, WorkspaceMemory keeps it coherent across time, and WorkspaceLayout keeps the per-Workspace view state separate from other Workspaces.

---

# Cross-Links

- The active Workspace identity flows from WorkspaceManager into every runtime service.
- Memory reads are scoped by the active Workspace identity held by WorkspaceManager.
- Layout is loaded and saved against the active Workspace's `workspaceId`.
- Projects (see [[Project-Part01]]) exist only inside a Workspace bound by WorkspaceManager.

---

# AI Notes

The Workspace concept is enforced by WorkspaceManager. If a runtime service can act without consulting WorkspaceManager for the active Workspace, the isolation guarantee is already broken.

Layout, memory, and runtime state are three different things all keyed by the same Workspace identity. Do not let one leak into another's scope.

# Related Documents

- [[Workspace-Part01]]
- [[Workspace-Part02]]
- [[Workspace-Diagrams]]
- [[01-core-concepts/README]]
- [[WorkspaceManager-Part01]]
- [[WorkspaceManager-Part03]]
- [[WorkspaceMemory-Part01]]
- [[07-ui-ux/WorkspaceLayout/WorkspaceLayout-Part01]]
- [[Project-Part01]]
