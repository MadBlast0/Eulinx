---
title: ArchitectureSummary - Part 01
status: draft
version: 1.0
tags:
  - ai-context
  - architecture
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part02]]"
  - "[[99-ai-context/ArchitectureSummary/ArchitectureSummary-Diagrams]]"
  - "[[02-runtime/README]]"
---

# ArchitectureSummary (Part 01) — The Layered Model

## Document Index

Part 01 - The layered model and the separation of AI from runtime
Part 02 - Frontend (React/TS) shape
Part 03 - Backend (Rust thin bridge) shape
Part 04 - Runtime services and the EventBus
Part 05 - Workers, Workflows, Memory, Plugins

## The one rule that explains everything

Eulinx cleanly separates the **AI decision layer** (which plans and reasons) from the **deterministic runtime layer** (which schedules, locks, merges, and enforces permissions). Runtime services do NOT use an LLM. This separation is what makes the system reliable and cheap: model tokens are never spent on work that can be done algorithmically.

## Stack at a glance

- Desktop: Tauri v2 (Rust thin backend).
- Frontend: React 19 + TypeScript + Vite + pnpm.
- Styling: Tailwind CSS + shadcn/ui + Lucide icons + Motion (Framer Motion).
- State: Zustand (project-scoped) + TanStack Query (async/server-shaped data).
- Graph: React Flow (node editor).
- Terminals: xterm.js (frontend) ↔ Rust PTY (backend).
- Database: SQLite (SQLx) for local relational data; LanceDB for vectors; Tantivy for local search.
- AI: multi-provider, streaming, BYOK; MCP for capabilities.

## Layering (from outside in)

```text
UI (React)                       <- never holds truth, only reflects it
  -> Services layer (TypeScript) <- the ONLY place UI talks to backend
    -> Tauri IPC (invoke)        <- commands
      -> Rust backend (thin)     <- native OS work only
EventBus (listen)                <- the backend pushes truth back out
```

The UI never calls `invoke()` directly. It goes through a service. The Rust backend only does native OS work: filesystem, PTY/terminal management, window management, secure storage, native dialogs, performance-critical operations. All business logic stays in TypeScript.

## AI Notes

Do not blur the AI/runtime boundary. If a service can be deterministic, make it deterministic.

Do not let the UI hold authoritative state. The runtime owns truth; the EventBus broadcasts it; the UI reflects it.

## Related Documents

- [[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part02]]
- [[99-ai-context/ArchitectureSummary/ArchitectureSummary-Diagrams]]
- [[02-runtime/README]]
- [[07-ui-ux/README]]
