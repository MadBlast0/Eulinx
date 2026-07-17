---
title: CodingRules - Part 04
status: draft
version: 1.0
tags:
  - ai-context
  - coding-rules
  - testing
  - git
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/CodingRules/CodingRules-Part03]]"
  - "[[12-development/README]]"
  - "[[16-testing/README]]"
---

# CodingRules (Part 04) — Testing, Git, Naming

## Document Index

Part 01 - Small tasks, no merged layers, fail-closed
Part 02 - TypeScript-first, Rust boundary, no code in specs
Part 03 - State, services, and EventBus discipline
Part 04 - Testing, git, and naming rules

## Rule 13 — Test the TypeScript logic

Because ~95% of the app is TypeScript, fast unit and integration suites are the primary guardrail. Write a test for every non-trivial service, store, and util. Rust is covered by `cargo test` only where it exists. E2E uses Playwright for critical paths.

## Rule 14 — Keep the docs in sync

When a task changes behavior described in the vault, update the relevant spec Part (or note it). The Obsidian vault is the single source of truth; drift between code and docs is a defect.

## Rule 15 — Git hygiene

Initialize Git, use a `.gitignore`, commit in small logical units, write clear messages, never commit secrets or provider keys. Provider keys live in the OS secure store, never in the repo.

## Rule 16 — Naming and structure discipline

Feature-based folders (each feature owns `components/`, `hooks/`, `types/`, `services/`, `store/`, `utils/`). Shared types are centralized. No duplicated interfaces. Follow the layout in [[12-development/FolderStructure-Part01]].

## AI Notes

Do not skip tests for a "small" change; the cheap model regresses silently.

Do not commit keys or `.env` files.

Do not create a new global type when one already exists centrally.

## Related Documents

- [[99-ai-context/CodingRules/CodingRules-Part03]]
- [[12-development/README]]
- [[16-testing/README]]
- [[13-roadmap/README]]
