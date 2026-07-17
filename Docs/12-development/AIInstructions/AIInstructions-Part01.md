---
title: AIInstructions Specification - Part 01
status: draft
version: 1.0
tags:
  - development
  - ai-instructions
related:
  - "[[12-development/README]]"
  - "[[AIInstructions-Part02]]"
  - "[[AIInstructions-Part03]]"
  - "[[AIInstructions-Part04]]"
---

# AIInstructions Specification (Part 01)

## Document Index

Part 01 - The Model, The Rule File & Global Context Pack
Part 02 - Task Granularity & The "Small Focused Tasks" Policy
Part 03 - Forbidden Actions & Guardrails
Part 04 - Prompting Pattern & Handoff Protocol

# Purpose

AIInstructions defines how the cheap coding model (DeepSeek V4 Flash, free tier) is directed to build Eulinx. Because the model authored most of the code and is weaker than a flagship model, it MUST be constrained by explicit instructions, a single source of truth, and a strict task size policy. This is the most important document in `12-development`.

# The Model

The primary authoring model is DeepSeek V4 Flash (free). It is strong at standard coding work but hallucinates more on large architectural changes. The entire engineering setup (95% TypeScript, thin Rust, global design system, enforced lint/typecheck) is tuned so this model succeeds.

# The Rule File (MUST)

A single authoritative instruction file at the repo root (e.g. `CLAUDE.md` or an `AI.md`) MUST exist and MUST be read by the model before any task. It MUST contain, in condensed form:

- the stack summary (Tauri v2 + React 19 + TS + Vite + pnpm + Tailwind + shadcn/ui + Zustand + TanStack Query + React Flow + xterm.js + SQLite);
- the thin-Rust mandate (Rust only for PTY/FS/windows/store/dialogs);
- the invoke rule (UI never calls `invoke` directly; use `services/`);
- the design-system-first rule (no hardcoded colors/spacing/fonts);
- the lint/format/typecheck gate (run before declaring done);
- links to this vault's key sections ([[ArchitectureRules-Part01]], [[FolderStructure-Part04]], [[NamingConvention-Part01]]).

# Global Context Pack

Before a non-trivial task, the model SHOULD be pointed at a small set of concise context notes (the "99-ai-context" pack): project overview, architecture summary, coding rules, design rules, common mistakes, implementation order. This fits the model's context window and prevents it from re-deriving the architecture from scratch each session.

# Related Documents

- [[AIInstructions-Part02]]
- [[ArchitectureRules-Part01]]
- [[FolderStructure-Part04]]
