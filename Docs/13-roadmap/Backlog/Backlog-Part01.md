---
title: Backlog Specification - Part 01
status: draft
version: 1.0
tags:
  - roadmap
  - backlog
related:
  - "[[13-roadmap/README]]"
  - "[[Backlog-Part02]]"
  - "[[FutureIdeas-Part01]]"
---

# Backlog Specification (Part 01)

## Document Index

Part 01 - Unordered Candidate Work (A–M)
Part 02 - Unordered Candidate Work (N–Z) and Triage Rules

# Purpose

The Backlog holds unordered candidate work: refinements, speculative features, and small improvements that are not yet assigned to a phase. It is the intake pile; FutureIdeas holds the larger deferred concepts.

Items here are NOT prioritized. They await triage: promote to a phase, merge into FutureIdeas, or discard.

# Backlog Items (A–M)

Accessibility pass beyond Phase 4 basics: screen-reader hooks, high-contrast mode, zoom support. Extends [[07-ui-ux/Accessibility/Accessibility-Part01]].

Browser node as a hosted Premium capability (Pro tier) beyond local MCP. See [[11-features/Browser/Browser-Part01]].

Command palette and centralized keyboard shortcuts surface. See [[07-ui-ux/KeyboardShortcuts]].

Concurrency tuning per pricing plan (exact numbers tunable). See [[01-core-concepts/README]] pricing.

Cost analytics enhancements: budgets, alerts, per-run estimates refinement.

Dark/light theme polish and runtime switching via design tokens. See [[07-ui-ux/Themes/Themes-Part01]].

Edge-case hardening for the Lock Manager: symbol-level locks, lock queues, deadlock detection. See [[02-runtime/LockManager/LockManager-Part01]].

Export/import of entire workspaces as portable bundles (JSON + artifacts).

File explorer integration with terminal cwd and agent file tools. See [[11-features/Browser/Browser-Part01]]/Files.

Git panel depth: diff view, history, stage/commit/push like VS Code Source Control.

Human-in-the-loop UX patterns library (approval modals, blocked states). See [[02-runtime/PermissionManager/PermissionManager-Part01]].

Internationalization / RTL support for text-containing components. See [[07-ui-ux/Accessibility/Accessibility-Part01]].

# Triage Discipline

Backlog items MUST be small and describable in one paragraph. If an item is large, move it to [[FutureIdeas-Part01]].

The backlog is reviewed at each phase boundary; promoted items get explicit acceptance criteria before implementation.

# Related Documents

- [[Backlog-Part02]]
- [[FutureIdeas-Part01]]
- [[12-development/README]]
