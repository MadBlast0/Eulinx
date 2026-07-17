---
title: CodingRules - Part 01
status: draft
version: 1.0
tags:
  - ai-context
  - coding-rules
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/CodingRules/CodingRules-Part02]]"
  - "[[12-development/README]]"
---

# CodingRules (Part 01) — Small Tasks and Layering

## Document Index

Part 01 - Small tasks, no merged layers, fail-closed
Part 02 - TypeScript-first, Rust boundary, no code in specs
Part 03 - State, services, and EventBus discipline
Part 04 - Testing, git, and naming rules

These rules are mandatory for every AI coding model (especially the cheap DeepSeek V4 Flash model that authors most of Eulinx).

## Rule 1 — Break work into small, verifiable tasks

The cheap coding model does much better with small, focused tasks than with "build the whole app" prompts. Split every feature into tasks like: create the schema; implement the registry; add terminal session management; build the canvas; connect nodes to execution; add streaming; write tests; refactor. Each task MUST have explicit acceptance criteria and be implementable in one pass.

## Rule 2 — Never merge layers

Do not put business logic in a component. Do not call `invoke` from a component. Do not let the UI hold authoritative state. The layers are: UI → Services (TS) → Tauri IPC → Rust (thin). Each layer may only call the one below it. The UI reflects state and dispatches intents; it does not own truth.

## Rule 3 — Fail closed

When a permission, lock, budget, or validation check is uncertain, deny. A Worker MUST NOT perform a destructive action (delete, push, publish, external call) without explicit approval. The system prefers safety over progress. Uncertainty is a reason to stop, ask the user, or log — never to proceed.

## Rule 4 — Respect the AI/runtime boundary

Runtime services are deterministic and do NOT call an LLM. Do not move scheduling, locking, merging, or permission enforcement into AI code. Do not move business logic into Rust.

## AI Notes

Do not implement an entire phase or feature in a single prompt.

Do not skip dependency tasks. Later systems assume earlier ones exist.

When unsure which layer owns something, push it down to the services layer or a store, never up into the component.

## Related Documents

- [[99-ai-context/CodingRules/CodingRules-Part02]]
- [[12-development/README]]
- [[02-runtime/README]]
