---
title: AIInstructions Specification - Part 03
status: draft
version: 1.0
tags:
  - development
  - ai-instructions
related:
  - "[[12-development/README]]"
  - "[[AIInstructions-Part02]]"
  - "[[AIInstructions-Part04]]"
---

# AIInstructions Specification (Part 03)

## Document Index

Part 01 - The Model, The Rule File & Global Context Pack
Part 02 - Task Granularity & The "Small Focused Tasks" Policy
Part 03 - Forbidden Actions & Guardrails
Part 04 - Prompting Pattern & Handoff Protocol

# Purpose

This part lists the forbidden actions the cheap model MUST NOT take, and the guardrails that keep it safe. These mirror the ArchitectureRules but are phrased as direct prohibitions for the model.

# Forbidden Actions (MUST NOT)

- Do NOT write business logic inside React components or pages.
- Do NOT call Tauri `invoke` from the UI layer; use the `services/` layer.
- Do NOT hardcode colors, spacing, radii, font sizes, or shadows; use tokens.
- Do NOT import fonts or icons directly inside a component; use the global wrappers.
- Do NOT use `any` in shipped TypeScript; use `unknown` and narrow.
- Do NOT add inline styles.
- Do NOT create circular imports between features or layers.
- Do NOT expand the Rust surface beyond the thin native bridge (PTY, FS, windows, secure store, dialogs).
- Do NOT disable ESLint/Prettier/tsc to make a gate pass; fix the root cause.
- Do NOT commit secrets, `.env` files, or non-pnpm lockfiles.
- Do NOT rename core domain vocabulary (Worker, Orchestrator, Task, Artifact, Workspace, Runtime, Memory).

# Guardrails

- After editing, the model MUST run lint, Prettier check, and `tsc`, and MUST resolve all errors before reporting completion.
- The model MUST keep Rust DTOs in `src-tauri/src/ipc/` in sync with TypeScript types in `src/types/`.
- The model MUST prefer promoting shared logic to `components/`, `hooks/`, `services/`, or `stores/` over duplicating it inside a feature.
- The model MUST commit atomically per logical step using Conventional Commits.

# Related Documents

- [[AIInstructions-Part04]]
- [[ArchitectureRules-Part01]]
- [[CodingStandards-Part01]]
