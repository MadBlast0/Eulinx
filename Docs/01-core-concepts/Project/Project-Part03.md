---
title: Project Specification - Part 03
status: draft
version: 1.0
tags:
  - core-concepts
  - project
related:
  - "[[01-core-concepts/README]]"
  - "[[Project-Part01]]"
  - "[[Project-Part02]]"
  - "[[Project-Diagrams]]"
  - "[[Workspace-Part01]]"
  - "[[Session-Part01]]"
  - "[[Task-Part01]]"
  - "[[Worker-Part01]]"
---

# Project Specification (Part 03)

## Document Index

Part 01 — Purpose, Definition, and Relationship to Workflows, Artifacts, Sessions
Part 02 — Project Structure on Disk, Relationship to Workflows/Artifacts, Lifecycle
Part 03 — Project in Runtime: Relationship to Sessions, Tasks, Workers
Diagrams — Project-Diagrams.md

---

# Purpose

This part shows how a Project relates to the runtime objects that actually do the work: Sessions, Tasks, and Workers.

---

# Relationship to Sessions

A Project is advanced by Sessions (see [[Session-Part01]]).

A Session is a single continuous execution instance of a Workspace. Within a Project, Sessions provide the execution timelines that move the work forward. The Workspace owns the Session at the boundary level; the Project gives the Session its work context.

---

# Relationship to Tasks

A Project's work is broken into Tasks (see [[Task-Part01]]).

Tasks are the units of execution that Workers and Orchestrators perform. Tasks belong to the Project's effort and are tracked through Sessions and Workflows.

---

# Relationship to Workers

A Project's Tasks are carried out by Workers and Orchestrators (see [[Worker-Part01]]).

Workers are live execution units backed by real terminal processes. They operate inside the Workspace boundary and act on the Project's work. A Worker is created inside the Workspace and may be associated with a Project's Tasks through its Session.

---

# Runtime View

```text
Workspace (boundary)
  |
  +-- Project (unit of work)
        |
        +-- Workflows   (how work moves)
        +-- Artifacts   (structured outputs)
        +-- Sessions    (execution timelines)
              |
              +-- Tasks
                    |
                    +-- Workers / Orchestrators
```

The Workspace supplies the boundary and the agents. The Project supplies the organization of work. Sessions, Tasks, and Workers operate at the intersection: inside the Workspace, in service of the Project.

---

# Cross-Links

- Sessions are created inside the Workspace and record Project work.
- Tasks are units of Project execution tracked through Sessions.
- Workers run inside the Workspace and act on Project Tasks.
- Workflows (see [[Workflow-Part01]]) orchestrate the Tasks and Workers for the Project.

---

# AI Notes

A Project has no runtime identity of its own beyond its Workspace containment and its Workflows/Artifacts/Sessions. Do not invent a separate Project runtime process.

When a Worker acts, ask which Project (and therefore which Workspace) its Session belongs to. The answer keeps the action inside the right boundary.

# Related Documents

- [[Project-Part01]]
- [[Project-Part02]]
- [[Project-Diagrams]]
- [[01-core-concepts/README]]
- [[Workspace-Part01]]
- [[Session-Part01]]
- [[Task-Part01]]
- [[Worker-Part01]]
- [[Workflow-Part01]]
- [[Artifact-Part01]]
