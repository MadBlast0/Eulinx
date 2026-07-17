---
title: NamingConvention Specification - Part 02
status: draft
version: 1.0
tags:
  - development
  - naming-convention
related:
  - "[[12-development/README]]"
  - "[[NamingConvention-Part01]]"
  - "[[NamingConvention-Part03]]"
---

# NamingConvention Specification (Part 02)

## Document Index

Part 01 - Files, Folders & Packages
Part 02 - Variables, Functions, Types & Components
Part 03 - Events, Stores, Constants & Domain Terms

# Purpose

This part covers code-level identifiers: variables, functions, types, and components.

# Variables & Functions

- Variables and functions MUST use `camelCase`: `activeWorker`, `spawnWorker()`, `getArtifactById()`.
- Function names MUST be verb-led and describe the action: `create`, `fetch`, `update`, `delete`, `subscribe`, `select`.
- Boolean variables MUST use a prefix or phrasing that reads as a question: `isLoading`, `hasError`, `canEdit`, `shouldRetry`.
- Avoid single-letter variables except in tight, conventional scopes (loop indices `i`, `j`).

# Types & Interfaces

- Types, interfaces, enums (and type aliases) MUST use `PascalCase`: `Worker`, `Artifact`, `RunState`, `TerminalSession`.
- Interface names MUST NOT be prefixed with `I` (no `IWorker`). Type aliases and interfaces are both `PascalCase` without prefix.
- Generic type parameters use single uppercase letters or descriptive `PascalCase` (`T`, `TWorker`).

# Components

- Components MUST use `PascalCase` and be named for what they are, not the feature only: `TerminalCard`, `WorkflowCanvas`, `AgentChip`.
- Global design-system wrappers MUST wrap the underlying primitive with the same or clearer name: `Button` wraps the shadcn button; `Modal` wraps the dialog primitive.
- Event handler props MUST be `on` + Event: `onClick`, `onWorkerSpawn`, `onArtifactCreated`.

# Related Documents

- [[NamingConvention-Part03]]
- [[CodingStandards-Part02]]
- [[ArchitectureRules-Part02]]
