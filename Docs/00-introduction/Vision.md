---
title: Vision
status: draft
version: 1.0
tags:
  - vision
  - introduction
  - architecture
related:
  - "[[Philosophy]]"
  - "[[CorePrinciples]]"
  - "[[Workspace-Part01]]"
  - "[[Worker]]"
  - "[[Runtime]]"
---

# Vision

> **Eulinx is a local-first AI Operating System for knowledge work.**
> Rather than giving a task to a single AI chat, the user supervises an intelligent runtime that dynamically creates, coordinates, and manages teams of AI workers executing inside real terminal sessions.

---

# Purpose

This document defines **what Eulinx is**, **why it exists**, and **what it aims to become**.

It is the highest-level document in the entire documentation set and should be read before any architecture or implementation document.

---

# One-Sentence Vision

Eulinx enables people to manage AI work the same way an operating system manages computer processes: visually, safely, locally, and transparently.

---

# What Eulinx Is

Eulinx is a cross-platform desktop application where:

- Every project lives inside an isolated workspace.
- AI workers execute inside real CLI terminals.
- Workers can dynamically create additional workers.
- Work is visualized as a live runtime graph.
- Outputs are exchanged as structured artifacts instead of raw conversations.
- Deterministic runtime services (scheduler, merge manager, permission manager, etc.) ensure safety while AI focuses on reasoning.

---

# What Eulinx Is NOT

- Not a chatbot.
- Not a wrapper around a single LLM.
- Not an Electron IDE clone.
- Not merely an automation builder.
- Not just another node editor.

The node graph is a visualization of execution, not the product itself.

---

# Core Philosophy

User
↓
Goal
↓
Runtime plans the work
↓
Workers are created dynamically
↓
Workers create artifacts
↓
Artifacts are verified
↓
Verified artifacts are merged
↓
Project advances

---

# Core Principles

1. Local-first by default.
2. User owns their data.
3. Real terminal execution over simulated actions.
4. AI reasons; runtime guarantees correctness.
5. Small workers with isolated context outperform one giant context.
6. Workers communicate through artifacts and events.
7. Every important action is observable.
8. Human approval is available for sensitive operations.
9. Everything should be extensible through plugins and tools.
10. Cross-platform from day one.

---

# Long-Term Vision

Imagine opening a project and asking:

> "Build this feature."

Instead of one AI chat attempting everything, Eulinx constructs a temporary organization:

Root Orchestrator
 ├─ Authentication Phase
 ├─ Backend Phase
 ├─ Frontend Phase
 ├─ Testing Phase

Each phase creates workers only when required. Workers collaborate, verify one another, and return summarized progress upward. The user watches the runtime evolve rather than manually coordinating every step.

---

# Success Criteria

A successful Eulinx session should make the user feel like they are directing an engineering organization rather than prompting a chatbot.

---

# Relationships

This document intentionally avoids implementation details.

See:
- [[Philosophy]]
- [[CorePrinciples]]
- [[Workspace-Part01]]
- [[Worker]]
- [[Runtime]]
- [[Artifact]]
- [[Task]]

---

# AI Notes

For coding assistants:

- Never describe Eulinx as "just another AI chat application."
- Workers are execution units, not predefined personalities.
- Runtime services are deterministic software components.
- Prefer artifact-based communication over transcript sharing.
- Preserve local-first architecture whenever adding features.

