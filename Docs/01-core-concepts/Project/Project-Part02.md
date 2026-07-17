---
title: Project Specification - Part 02
status: draft
version: 1.0
tags:
  - core-concepts
  - project
related:
  - "[[01-core-concepts/README]]"
  - "[[Project-Part01]]"
  - "[[Project-Part03]]"
  - "[[Project-Diagrams]]"
  - "[[Workspace-Part01]]"
  - "[[Workflow-Part01]]"
  - "[[Artifact-Part01]]"
---

# Project Specification (Part 02)

## Document Index

Part 01 — Purpose, Definition, and Relationship to Workflows, Artifacts, Sessions
Part 02 — Project Structure on Disk, Relationship to Workflows/Artifacts, Lifecycle
Part 03 — Project in Runtime: Relationship to Sessions, Tasks, Workers
Diagrams — Project-Diagrams.md

---

# Purpose

This part describes how a Project is structured on disk, how it relates to Workflows and Artifacts, and how it moves through its lifecycle.

---

# Structure on Disk

A Project lives inside its Workspace's file root. It does not define its own separate root; it is a named unit of work within the Workspace's folder tree.

A Project's on-disk structure is organized so that:

- its source and working files sit within the Workspace root
- its Workflow definitions are stored and versioned
- its Artifacts are recorded and retrievable
- its Sessions and execution history are persisted in the Workspace database
- its project-scoped state is recoverable on reopen

Eulinx MUST scope all Project file operations to the Workspace file root. A Project MUST NOT write outside the Workspace boundary.

---

# Relationship to Workflows

A Project contains one or more Workflows (see [[Workflow-Part01]]).

Each Workflow is a graph of Nodes and Edges describing how work moves through the Project. Workflows may be:

- user-authored plans
- generated execution plans from an Orchestrator
- live runtime graphs modified while work runs
- reusable templates
- replayed historical graphs

Workflows belong to the Project's work and are persisted within the Workspace.

---

# Relationship to Artifacts

A Project produces and consumes Artifacts (see [[Artifact-Part01]]).

Artifacts are the structured outputs that flow through the Project's Workflows: code patches, summaries, documents, test results, and review records. Artifacts are attached to the Project's work and tracked in the Workspace database.

---

# Lifecycle

A Project moves through a simple lifecycle inside its Workspace:

- Created — a new unit of work is established within the Workspace
- Active — Workflows run, Artifacts are produced, Sessions execute
- Paused — work is suspended but state is preserved
- Completed — the unit of work reaches a done state
- Archived — the Project is kept for reference without active execution

A Project's lifecycle is bounded by the Workspace. If the Workspace is closed, the Project's active work is ended or persisted along with the Workspace.

---

# Responsibilities

A Project MUST:

- Live within its Workspace's file root
- Persist its Workflows and Artifacts in the Workspace database
- Preserve execution history through Sessions
- Remain recoverable when the Workspace reopens

A Project MUST NOT:

- Create a file root outside the Workspace
- Move its Artifacts or Workflows into another Workspace by default
- Outlive the Workspace that contains it

---

# AI Notes

Keep Project structure inside the Workspace root. The moment a Project writes its own isolated root, the Workspace boundary is weakened.

Artifacts and Workflows are the durable record of a Project. Persist them; do not treat them as ephemeral UI state.

# Related Documents

- [[Project-Part01]]
- [[Project-Part03]]
- [[Project-Diagrams]]
- [[01-core-concepts/README]]
- [[Workspace-Part01]]
- [[Workflow-Part01]]
- [[Artifact-Part01]]
- [[Session-Part01]]
