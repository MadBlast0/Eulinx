---
title: ArchitectureSummary - Part 03
status: draft
version: 1.0
tags:
  - ai-context
  - architecture
  - backend
  - rust
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part02]]"
  - "[[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part04]]"
  - "[[02-runtime/README]]"
---

# ArchitectureSummary (Part 03) — Backend Shape (Rust Thin Bridge)

## Document Index

Part 01 - The layered model and the separation of AI from runtime
Part 02 - Frontend (React/TS) shape
Part 03 - Backend (Rust thin bridge) shape
Part 04 - Runtime services and the EventBus
Part 05 - Workers, Workflows, Memory, Plugins

## The Rust boundary

Rust is ONLY responsible for native OS work and performance-critical operations. Keep it extremely thin — roughly 5% of the codebase.

Rust owns:

- Native OS APIs, window management, native dialogs.
- Filesystem access (read/write/list within workspace boundaries).
- PTY / terminal management (spawning and streaming terminal processes; xterm.js talks to these PTYs).
- Secure storage (OS keychain for BYOK provider keys).
- Performance-critical utilities where TypeScript would be too slow.

Rust MUST NOT own: agent logic, workflow execution, memory strategy, tool intelligence, orchestration decisions, or any business logic. Those live in TypeScript.

## Tauri IPC contract

- Commands are exposed via Tauri `invoke` and grouped by domain (terminal, fs, window, store, dialog, etc.).
- Events are emitted via the EventBus and consumed on the frontend with `listen`.
- Every command SHOULD be small and single-purpose so the cheap coding model can implement it reliably.

## AI Notes

Do not widen the Rust surface. When in doubt, keep the backend thin and push logic to TypeScript.

Do not put LLM or orchestration logic in Rust.

Do not leak secrets: provider keys go to the OS secure store, never into SQLite or logs.

## Related Documents

- [[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part02]]
- [[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part04]]
- [[02-runtime/README]]
- [[12-development/README]]
