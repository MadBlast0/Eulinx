---
title: 01 Core Concepts
status: draft
version: 1.0
tags:
  - core-concepts
  - Eulinx
  - overview
  - flow:P01-CORE-TYPES
  - flow:P01-CORE-ENUMS
  - flow:P01-CORE-CONSTANTS
  - flow:P01-CORE-UUID
  - flow:P04-STATE-WORKER
  - flow:P04-STATE-SESSION
  - flow:P04-STATE-TASK
  - flow:P06-SPAWN-TFACTORY
  - flow:P06-SPAWN-SFACTORY
  - flow:P07-SESSION-CREATE
  - flow:P07-SESSION-META
  - flow:P07-SESSION-RESUME
  - flow:P07-SESSION-BRANCH
  - flow:P08-WORKER-BASE
  - flow:P08-WORKER-CTX
  - flow:P14-SEC-SESSISO
  - flow:P17-CLI-SESSION
  - flow:P18-UI-SESSIONVIEW
related:
  - "[[00-introduction/README]]"
  - "[[02-runtime/README]]"
  - "[[04-memory/README]]"
---
# 01-core-concepts

## Purpose

This folder defines every fundamental object that exists inside Eulinx.

These documents are the foundation of the entire architecture. All later documentation should reference these definitions rather than redefining concepts.

## Reading Order

1. [[Workspace-Part01]]
2. [[Project-Part01]]
3. Worker.md
4. Orchestrator.md
5. Runtime.md
6. Execution.md
7. Task.md
8. Artifact.md
9. Memory.md
10. Session.md
11. Tool.md
12. Provider.md
13. Model.md
14. Prompt.md
15. Permission.md
16. Workflow.md

## Rules

- Use the definitions from [[00-introduction/Terminology]].
- Link to related documents using Obsidian wiki links.
- Do not duplicate concepts between files.
- Each document should explain:
  - What it is
  - Why it exists
  - Responsibilities
  - Lifecycle
  - Relationships
  - Implementation notes
  - AI Notes
  - Future expansion

## Architecture Philosophy

Everything in Eulinx should ultimately be built from these core concepts. If a feature introduces a new foundational concept, it should first be documented here before implementation.

## Related Documents

- [[00-introduction/README]]
- [[02-runtime/README]]
- [[03-worker-system/README]]
- [[04-memory/README]]
- [[06-workflow-engine/README]]

