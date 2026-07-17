---
title: Backlog Specification - Part 02
status: draft
version: 1.0
tags:
  - roadmap
  - backlog
related:
  - "[[Backlog-Part01]]"
  - "[[FutureIdeas-Part01]]"
---

# Backlog Specification (Part 02)

## Document Index

Part 01 - Unordered Candidate Work (A–M)
Part 02 - Unordered Candidate Work (N–Z) and Triage Rules

# Backlog Items (N–Z)

Notifications and toasts center for agent/terminal/workflow events. See [[11-features/Notifications/Notifications-Part01]].

Onboarding flow: first-run picks a project folder, suggests a starter template, explains the three panes. See [[00-introduction/README]].

Orchestrator rewrite-plan visualization: show the graph growing as plans change. See [[06-workflow-engine/DynamicGraphs/DynamicGraphs-Part01]].

Performance hardening: virtualized lists, memoization, lazy routes/panels. See [[12-development/README]].

Permission UX: per-worker permission editor mirroring Claude Code style toggles. See [[02-runtime/PermissionManager/PermissionManager-Part01]].

Prompt library UI: browse/version/test prompts. See [[13-roadmap/Phase3]] Prompt Manager.

Refinement modes depth: allow different models for critic vs generator (cheap generator + strong critic). See [[10-ai-system/RefinementLoop]].

Release notes and changelog generation from commit range. See [[11-features/Coding/Coding-Part01]].

Sandbox visualization: show which workers run headless vs maximized; resource usage per worker.

Templates gallery browsing/import; publish-your-own (Plus+). See [[11-features/Templates/Templates-Part01]].

Verifier judge labeling: LLM-judge output labeled "suggested," not "correct." See [[10-ai-system/Verifier/Verifier-Part01]].

Worker metrics dashboard: token usage, cost, execution time, success rate per agent/workflow/project.

# Triage Rules (continued)

An item is promoted to a phase only when its dependencies (per the phase docs) are shipped and a concrete owner/acceptance exists.

Items that duplicate a FutureIdea MUST be consolidated into [[FutureIdeas-Part01]] to avoid split tracking.

The backlog is allowed to stay messy; that is its purpose. It is not a commitment.

# Related Documents

- [[Backlog-Part01]]
- [[FutureIdeas-Part01]]
- [[12-development/README]]
- [[10-ai-system/README]]
