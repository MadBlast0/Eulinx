---
title: Workspace Specification - Part 01
status: draft
version: 1.0
tags:
  - core-concepts
  - workspace
related:
  - "[[01-core-concepts/README]]"
  - "[[Workspace-Part02]]"
  - "[[Workspace-Part03]]"
  - "[[Workspace-Diagrams]]"
  - "[[WorkspaceManager-Part01]]"
  - "[[WorkspaceMemory-Part01]]"
  - "[[Project-Part01]]"
---

# Workspace Specification (Part 01)

## Document Index

Part 01 — Purpose, Definition, Boundaries, and What a Workspace Owns
Part 02 — Workspace Lifecycle: Creation, Switching, Persistence, Isolation
Part 03 — Workspace in the Runtime: WorkspaceManager, WorkspaceMemory, WorkspaceLayout
Diagrams — Workspace-Diagrams.md

---

# Purpose

A Workspace is the top-level isolation boundary in Eulinx.

It is the container that everything else lives inside: the user's files, the Projects they are working on, the memory that has been accumulated, the permissions that apply, the agents that run, and the terminal sessions that belong to the work.

A Workspace is NOT a single project. A Workspace is the environment that holds one or more Projects. The Workspace is the boundary; Projects are the units of work inside it.

When the user points Eulinx at a local folder, Eulinx creates an isolated Workspace scoped to that folder. Everything Eulinx does for that folder happens inside that Workspace and stays inside it.

---

# Philosophy

Workspace isolation is a safety rule, not a cosmetic feature.

The user may have many Projects open across many Workspaces. One Project's execution, memory, or file writes must never leak into another Workspace. A Worker, Tool, or Workflow that crosses a Workspace boundary is a bug, and the Workspace exists to make that boundary explicit, durable, and enforceable.

Every runtime service asks the same question before touching data: "which Workspace owns this?" If the answer is unclear, the action is not safe enough to run.

---

# Definition

A Workspace is the top-level boundary for:

- Files — the local folder tree the user selected and everything under it
- Memory scope — memory stored for this Workspace is not visible to other Workspaces
- Permissions — permission rules and approval policies that apply within this Workspace
- Agents — Workers, Orchestrators, and other agents spawned inside this Workspace
- Terminal sessions — the PTY-backed processes that back the agents
- Projects — the units of work contained within this Workspace
- Runtime state — sessions, tasks, artifacts, history, and execution records
- Settings — Workspace-level preferences that do not apply globally
- Database — the Workspace's own SQLite / LanceDB / Tantivy storage

A Workspace MUST own exactly one local file root. All file operations are validated against that root so that no operation escapes the Workspace.

---

# What a Workspace Owns

## Files

The Workspace owns a single local folder root. Eulinx creates isolation metadata inside or beside that folder so the Workspace can be reopened. All reads and writes are scoped to that root.

## Memory Scope

Memory inside a Workspace (see [[WorkspaceMemory-Part01]]) is scoped to that Workspace. It MUST NOT cross into another Workspace. Workspace memory holds stable, durable facts: architecture decisions, coding conventions, user preferences, project rules, and important artifact references.

## Permissions

Permission rules, approval gates, and budget policies are evaluated within the Workspace boundary. A permission granted in one Workspace does not extend to another.

## Agents and Terminal Sessions

Every Worker and Orchestrator is created inside a Workspace and backed by a real terminal process. Sessions (see [[Session-Part01]]) belong to a Workspace and record execution that happens within it.

## Projects

A Workspace contains one or more Projects (see [[Project-Part01]]). The Workspace is the boundary; the Projects are the work. A Project cannot exist outside a Workspace.

---

# Relationship to Projects

The relationship is strictly nested:

```text
Workspace  (top-level isolation boundary)
  |
  +-- Project A  (a unit of work inside the Workspace)
  +-- Project B  (another unit of work)
  +-- Workspace-wide memory, permissions, agents, sessions
```

A Workspace answers: "what folder, what files, what memory, what permissions, what agents."

A Project answers: "what work is being done, and what workflows, artifacts, and sessions belong to that work."

---

# Responsibilities

A Workspace MUST:

- Own exactly one local file root
- Isolate its files, memory, permissions, agents, and sessions from other Workspaces
- Provide a stable identity that runtime services bind to
- Persist its own state and metadata
- Scope memory and history to itself
- Support multiple Projects inside it

A Workspace MUST NOT:

- Share file roots with another Workspace
- Export its memory to another Workspace by default
- Allow a Worker or Tool from one Workspace to act on another
- Lose its boundary during switching or recovery

---

# AI Notes

Do not treat a Workspace as a single project. A Workspace is the boundary that holds Projects.

Any feature that touches project data must first answer: "which Workspace owns this?" If the answer is unclear, the feature is not safe enough to implement.

Isolation is the point. A second Workspace that can read the first one's memory or write its files has defeated the architecture.

# Related Documents

- [[Workspace-Part02]]
- [[Workspace-Part03]]
- [[Workspace-Diagrams]]
- [[01-core-concepts/README]]
- [[WorkspaceManager-Part01]]
- [[WorkspaceMemory-Part01]]
- [[Project-Part01]]
- [[Session-Part01]]
