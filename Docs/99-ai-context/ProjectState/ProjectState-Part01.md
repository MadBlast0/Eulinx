---
title: ProjectState - Part 01
status: draft
version: 1.0
tags:
  - ai-context
  - project-state
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/CurrentProgress/CurrentProgress-Part01]]"
  - "[[13-roadmap/README]]"
---

# ProjectState (Part 01) — Current Build State

## Document Index

Part 01 - Summary of the current build state

This note summarizes where Eulinx stands right now so an AI does not assume more (or less) is built than is true.

## Documentation state

The specification vault is well developed. Sections 00–04, 12, 13, 16, and 17 are complete; 05, 06–11, and 99 are structured and partially written. The vault is the single source of truth and is ahead of the code.

## Application code state

The project is at the **setup stage**. The intended stack is Tauri v2 + React 19 + TypeScript + Vite + pnpm, with Tailwind + shadcn/ui, Zustand, TanStack Query, React Flow, xterm.js, SQLite (SQLx), LanceDB, and Tantivy. The global design system skeleton (tokens, theme provider, base wrappers) and the thin Rust PTY bridge are the first code targets.

## What is NOT yet built

- No working runtime kernel (Scheduler, EventBus, MergeManager, LockManager) in code.
- No Worker spawner or live terminal execution wired end-to-end.
- No Workflow Engine executing graphs.
- No Artifact/Verifier/Merge path implemented.
- No UI canvas beyond scaffolding.

## Consequence for AI

Implement against the roadmap phases in small tasks. Prove the headless core loop (Worker → Artifact → Verifier → Merge → Workspace) before building UI. Keep Rust thin. Follow [[99-ai-context/CodingRules/CodingRules-Part01]] and the [[99-ai-context/AIChecklist/AIChecklist-Part01]].

## AI Notes

Do not assume a backend service exists just because its spec is written.

Do not scaffold the whole app in one pass; the cheap model regresses on large changes.

## Related Documents

- [[99-ai-context/CurrentProgress/CurrentProgress-Part01]]
- [[99-ai-context/ImplementationOrder/ImplementationOrder-Part01]]
- [[13-roadmap/README]]
