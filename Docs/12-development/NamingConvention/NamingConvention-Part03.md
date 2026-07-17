---
title: NamingConvention Specification - Part 03
status: draft
version: 1.0
tags:
  - development
  - naming-convention
related:
  - "[[12-development/README]]"
  - "[[NamingConvention-Part02]]"
  - "[[NamingConvention-Part01]]"
---

# NamingConvention Specification (Part 03)

## Document Index

Part 01 - Files, Folders & Packages
Part 02 - Variables, Functions, Types & Components
Part 03 - Events, Stores, Constants & Domain Terms

# Purpose

This part covers cross-cutting identifiers: events, stores, constants, and the canonical domain vocabulary that the cheap model MUST use consistently.

# Events

- Event names MUST be past-tense, namespaced facts: `worker.spawned`, `task.completed`, `artifact.created`, `workflow.started`, `terminal.closed`.
- Event payloads MUST be typed structs, never loose positional args.
- Event channel/topic strings MUST be declared once in `constants/` and referenced, never inlined.

# Stores (Zustand)

- Store files MUST be named `<domain>.store.ts` and the exported hook `use<Domaintore>` or a clear slice name: `useTerminalStore`, `useAgentStore`.
- State slices MUST be named after the entity, not the screen.

# Constants

- Constant identifiers MUST use `UPPER_SNAKE_CASE` for true constants: `DEFAULT_THEME`, `MAX_CONCURRENT_WORKERS`.
- Constant groups (routes, shortcuts, sizes) live in `constants/` as typed objects, not scattered magic strings.

# Canonical Domain Vocabulary (MUST)

The cheap model MUST use the established vocabulary and MUST NOT rename core concepts:

- `Worker` (not Agent/Process/Bot) — the execution unit, often a terminal.
- `Orchestrator` — coordinates workers (root/phase/task).
- `Task` — a unit of work owned by a worker.
- `Artifact` — a produced output (code, markdown, patch, json, image).
- `Workspace` — an isolated project folder environment.
- `Runtime` — the deterministic execution services (scheduler, merge, lock, permission).
- `Memory` — scoped, searchable context store.

# Related Documents

- [[NamingConvention-Part01]]
- [[AIInstructions-Part03]]
- [[ArchitectureRules-Part01]]
