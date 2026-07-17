---
title: Workflow Specification - Part 10
status: draft
version: 1.0
tags:
  - core-concepts
  - workflow
  - ui
  - canvas
related:
  - "[[Workflow-Part02]]"
  - "[[Worker-Part05]]"
  - "[[Permission-Part08]]"
---

# Workflow Specification (Part 10)

## Document Index

Part 01 - Purpose, Philosophy, and Core Model
Part 02 - Workflow Object Model and Graph Structure
Part 03 - Node Types and Node Contracts
Part 04 - Edge Types, Dependencies, and Data Flow
Part 05 - Workflow Lifecycle and State Machine
Part 06 - Execution Semantics and Scheduling
Part 07 - Dynamic Graphs, Worker Spawning, and Replanning
Part 08 - Artifacts, Memory, and Context Flow
Part 09 - Permissions, Safety, and Human Approval
Part 10 - UI, Canvas, and User Interaction
Part 11 - Events, Persistence, Versioning, and Replay
Part 12 - Implementation Checklist, Examples, and Future Expansion

# Purpose

The Workflow UI is the user's window into live AI work.

It should show not only what the system plans to do, but what is currently happening, what is blocked, what needs approval, what changed, and how Workers relate to each other.

# Canvas Philosophy

The canvas should feel like a live operations board, not a decorative diagram.

Users should be able to:

- see active work
- inspect Workers
- inspect Artifacts
- approve risky actions
- pause execution
- replay history
- zoom into subgraphs
- collapse busy areas
- understand progress
- intervene when needed

# Node Display Modes

Nodes SHOULD support display modes:

```text
full
compact
chip
collapsed_group
```

## Full

Shows rich details such as terminal output, task, status, artifacts, cost, and controls.

## Compact

Shows key operational details:

```text
Worker name
status
current task
progress
model/CLI
permission mode
latest artifact
```

## Chip

Shows minimal presence:

```text
status dot + short label
```

This is important when many Workers are running.

# Terminal Node Behavior

Worker terminal nodes should support:

- maximize terminal
- minimize to compact card
- collapse to chip
- view logs
- pause Worker
- terminate Worker
- inspect permissions
- inspect artifacts
- open context package

The user should not be forced to stare at every terminal to understand progress.

# Graph Layout

Eulinx should support:

- manual positioning
- auto layout
- hierarchical layout
- phase lanes
- grouped subgraphs
- minimap
- search
- filters
- focus mode

# Visual Status Language

Nodes and edges should communicate state visually.

Examples:

```text
running
waiting
blocked
needs approval
failed
completed
retrying
merged
simulation only
YOLO mode
```

This should be consistent across the app.

# Panels

Workflow UI should include panels:

- graph canvas
- node inspector
- execution timeline
- artifact viewer
- terminal panel
- approval panel
- logs panel
- metrics panel

# User Interaction

Users should be able to:

- create nodes
- connect nodes
- edit node config
- approve/reject actions
- drag nodes
- group nodes
- collapse subgraphs
- run selected nodes
- pause workflow
- stop workflow
- duplicate workflow
- save as template
- replay execution

# Mermaid Wireframe

```text
+------------------------------------------------------+
| Top Bar: Workspace | Workflow | Run | Pause | Search |
+-----------+------------------------------------------+
| Sidebar   | Canvas                                   |
| Nodes     |   [Root Orchestrator] -> [Phase]          |
| Tools     |          |                               |
| Artifacts |      [Worker Card] -> [Artifact]          |
| Memory    |          |                               |
|           |      [Verifier] -> [Merge]                |
+-----------+----------------------------+-------------+
| Bottom Terminal / Logs Panel           | Inspector   |
+----------------------------------------+-------------+
```

# AI Notes

Do not build the Workflow UI as a static diagram.

It must reflect live Runtime state.

Do not show every detail all the time. The UI needs zoom levels: full, compact, chip, group.

# Related Documents

- [[Workflow-Part11]]
- [[Worker-Part05]]
- [[Permission-Part08]]
- [[Artifact-Part01]]

