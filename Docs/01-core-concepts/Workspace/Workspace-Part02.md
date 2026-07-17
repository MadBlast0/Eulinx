---
title: Workspace Specification - Part 02
status: draft
version: 1.0
tags:
  - core-concepts
  - workspace
related:
  - "[[01-core-concepts/README]]"
  - "[[Workspace-Part01]]"
  - "[[Workspace-Part03]]"
  - "[[Workspace-Diagrams]]"
  - "[[WorkspaceManager-Part02]]"
---

# Workspace Specification (Part 02)

## Document Index

Part 01 — Purpose, Definition, Boundaries, and What a Workspace Owns
Part 02 — Workspace Lifecycle: Creation, Switching, Persistence, Isolation
Part 03 — Workspace in the Runtime: WorkspaceManager, WorkspaceMemory, WorkspaceLayout
Diagrams — Workspace-Diagrams.md

---

# Purpose

This part describes the lifecycle of a Workspace: how it is created, opened, switched, persisted, and isolated from other Workspaces.

---

# Creation

A Workspace is created when the user selects a local folder.

Eulinx MUST:

- Validate that the folder exists and is accessible
- Establish the folder as the Workspace's single file root
- Create the Workspace's isolation metadata and local storage
- Bind a database connection (SQLite / LanceDB / Tantivy) to the Workspace identity
- Initialize Workspace-scoped memory, permissions, and settings defaults

Eulinx MUST NOT create a Workspace whose file root overlaps an existing Workspace's file root.

---

# Opening and Closing

When a Workspace is opened, the runtime binds to it:

- The [[WorkspaceManager-Part01]] loads the Workspace identity
- Runtime services receive the active Workspace state
- The database connection is bound to the Workspace
- Settings are provided to runtime services
- Workspace-scoped memory becomes available

When a Workspace is closed:

- Active Sessions are ended or persisted
- The database connection is released
- Runtime services lose the active Workspace binding
- No runtime service may continue operating without an active Workspace

---

# Switching

Switching Workspaces MUST be explicit and safe.

Eulinx MUST:

- End or persist the current Workspace's active Sessions before switching
- Release the current Workspace's runtime bindings
- Load the target Workspace's identity, settings, database, and memory
- Rebind runtime services to the target Workspace
- Swap UI layout bound to the target Workspace (see [[WorkspaceManager-Part03]] and WorkspaceLayout)

Switching MUST NOT leave one Workspace's memory, permissions, or files reachable from another.

---

# Persistence

A Workspace persists:

- Its identity and file root
- Its database (artifacts, sessions, history, versioning)
- Its memory (Workspace memory, vector memory indexes)
- Its settings and permission policies
- Its UI layout state, bound by `workspaceId`

Persistence is per Workspace. A Workspace's data is never merged into another Workspace's storage.

---

# Isolation Rules

Isolation is the core guarantee of a Workspace.

A Workspace MUST isolate:

- Files — all operations validated against the single file root
- Memory — Workspace memory is not visible to other Workspaces
- Permissions — policies apply only within the Workspace
- Agents — Workers and Orchestrators belong to one Workspace
- Sessions — execution timelines are scoped to one Workspace
- Database — storage is bound to Workspace identity

A Workspace MUST NOT:

- Read or write another Workspace's file root
- Expose its memory to another Workspace by default
- Allow a Worker, Tool, or Workflow to cross into another Workspace
- Share a Session or execution state across Workspaces

---

# Recovery

If a Workspace fails to open:

- The runtime MUST NOT fall back to a different Workspace's data
- The user MUST be told which Workspace failed and why
- Recovery metadata held by the [[WorkspaceManager-Part01]] MUST be used to repair or restore the Workspace
- Other Workspaces MUST remain unaffected

---

# AI Notes

Switching is a full boundary change, not a filter. After a switch, every runtime service must be rebound; do not leave stale Workspace state behind.

Persistence is per Workspace. There is no global project store that Workspaces share.

# Related Documents

- [[Workspace-Part01]]
- [[Workspace-Part03]]
- [[Workspace-Diagrams]]
- [[01-core-concepts/README]]
- [[WorkspaceManager-Part02]]
- [[WorkspaceManager-Part03]]
- [[Session-Part01]]
