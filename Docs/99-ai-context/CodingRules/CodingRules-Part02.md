---
title: CodingRules - Part 02
status: draft
version: 1.0
tags:
  - ai-context
  - coding-rules
  - typescript
  - rust
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/CodingRules/CodingRules-Part01]]"
  - "[[99-ai-context/CodingRules/CodingRules-Part03]]"
  - "[[12-development/README]]"
---

# CodingRules (Part 02) — TypeScript-First and the Rust Boundary

## Document Index

Part 01 - Small tasks, no merged layers, fail-closed
Part 02 - TypeScript-first, Rust boundary, no code in specs
Part 03 - State, services, and EventBus discipline
Part 04 - Testing, git, and naming rules

## Rule 5 — TypeScript-first, ~95% TS

Almost everything is TypeScript: UI, AI chat, workflow engine, node editor, automation logic, agent logic, memory management, state, API calls, plugins. Rust is only the thin native bridge.

## Rule 6 — Keep Rust to native OS work only

Rust owns: filesystem, PTY/terminal management, window management, OS secure store, native dialogs, and small performance-critical utilities. It MUST NOT own agent logic, workflow execution, memory strategy, tool intelligence, or orchestration. When in doubt, keep the backend thin and push logic to TypeScript.

## Rule 7 — No code in the specification docs

The `Docs/` vault is architecture/design plans, not source. Writing specs is prose-only: what a component IS, what it OWNS, what it MUST/MUST NOT do, how it relates, and the data/events that flow. Inline `code spans` for identifiers are allowed; bullet field lists are allowed; fenced code of any language is forbidden. Diagrams use only ```mermaid and ```text.

## Rule 8 — Strict TypeScript, lint, format

Strict TypeScript. ESLint + Prettier. Absolute imports. Barrel exports. No inline styles. No duplicated logic. Prefer composition over inheritance. No circular dependencies between features.

## AI Notes

Do not write a Rust file unless the task is explicitly a native-capability or performance-critical bridge.

Do not add a code block to any doc inside `Docs/`. Rewrite as prose.

Do not disable strict TypeScript to make a task "easier". Fix the types.

## Related Documents

- [[99-ai-context/CodingRules/CodingRules-Part01]]
- [[99-ai-context/CodingRules/CodingRules-Part03]]
- [[12-development/README]]
- [[02-runtime/README]]
