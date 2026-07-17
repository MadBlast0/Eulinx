---
title: Project Specification - Part 01
status: draft
version: 1.0
tags:
  - core-concepts
  - project
related:
  - "[[01-core-concepts/README]]"
  - "[[Project-Part02]]"
  - "[[Project-Part03]]"
  - "[[Project-Diagrams]]"
  - "[[Workspace-Part01]]"
  - "[[Workflow-Part01]]"
  - "[[Artifact-Part01]]"
---

# Project Specification (Part 01)

## Document Index

Part 01 — Purpose, Definition, and Relationship to Workflows, Artifacts, Sessions
Part 02 — Project Structure on Disk, Relationship to Workflows/Artifacts, Lifecycle
Part 03 — Project in Runtime: Relationship to Sessions, Tasks, Workers
Diagrams — Project-Diagrams.md

---

# Purpose

A Project is a unit of work inside a Workspace.

Where a Workspace is the isolation boundary and the environment, a Project is the actual thing being built or worked on: a feature, a codebase, a research effort, a documentation drive, or any coherent body of work the user is pursuing.

A Project cannot exist outside a Workspace. It is always contained within one Workspace, and it inherits that Workspace's file root, memory scope, permissions, and agents.

---

# Definition

A Project is a coherent unit of work scoped to a Workspace.

A Project MAY represent:

- a codebase or service
- a feature under development
- a research or analysis effort
- a documentation or content effort
- a reusable automation or template effort
- any bounded body of work the user tracks as one thing

A Project is not the Workspace itself. A Workspace may contain several Projects at once, and each Project shares the Workspace's boundary rather than defining its own.

---

# Relationship to the Workspace

A Project is nested inside exactly one Workspace (see [[Workspace-Part01]]).

```text
Workspace  (top-level isolation boundary)
  |
  +-- Project  (a unit of work inside the Workspace)
        +-- Workflows
        +-- Artifacts
        +-- Sessions
        +-- Tasks
```

The Workspace owns the files, memory, permissions, and agents. The Project organizes the work that uses them.

---

# Relationship to Workflows

A Project contains Workflows (see [[Workflow-Part01]]).

Workflows are the structured graphs that describe how work moves through the Project: planning, execution, verification, and review. A Project may have many Workflows, each representing a different effort, phase, or automation.

---

# Relationship to Artifacts

A Project produces and consumes Artifacts (see [[Artifact-Part01]]).

Artifacts are the structured outputs of work: code patches, summaries, documents, test results, and review records. Artifacts belong to the Project's work and flow through its Workflows.

---

# Relationship to Sessions

A Project is advanced by Sessions (see [[Session-Part01]]).

A Session is a single continuous execution instance. Within a Project, Sessions record the execution timelines that move the work forward. The Workspace owns the Sessions at the boundary level; the Project gives them their work context.

---

# Responsibilities

A Project MUST:

- Belong to exactly one Workspace
- Represent a coherent unit of work
- Contain its Workflows, Artifacts, and Sessions
- Inherit the Workspace's file root, memory scope, permissions, and agents

A Project MUST NOT:

- Exist outside a Workspace
- Define its own isolation boundary separate from the Workspace
- Share Artifacts or Workflows with a Project in another Workspace by default

---

# AI Notes

A Project is a unit of work, not a boundary. The boundary is the Workspace. Do not give a Project its own file root or memory scope that competes with the Workspace's.

When organizing work, attach Workflows, Artifacts, and Sessions to a Project so they have a coherent home inside the Workspace.

# Related Documents

- [[Project-Part02]]
- [[Project-Part03]]
- [[Project-Diagrams]]
- [[01-core-concepts/README]]
- [[Workspace-Part01]]
- [[Workflow-Part01]]
- [[Artifact-Part01]]
- [[Session-Part01]]
