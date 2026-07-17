---
title: AIInstructions Specification - Part 04
status: draft
version: 1.0
tags:
  - development
  - ai-instructions
related:
  - "[[12-development/README]]"
  - "[[AIInstructions-Part03]]"
  - "[[AIInstructions-Part01]]"
---

# AIInstructions Specification (Part 04)

## Document Index

Part 01 - The Model, The Rule File & Global Context Pack
Part 02 - Task Granularity & The "Small Focused Tasks" Policy
Part 03 - Forbidden Actions & Guardrails
Part 04 - Prompting Pattern & Handoff Protocol

# Purpose

This part defines the recommended prompting pattern and the handoff protocol between the human, the model, and the repository. Consistency here is what makes the cheap model produce consistent code over months.

# Prompting Pattern

Each task prompt to the model SHOULD follow this shape:

1. Context pointer — "Read `CLAUDE.md` and [[ArchitectureRules-Part01]] first."
2. Goal — one sentence describing the desired outcome.
3. Scope — exact file/folder to create or modify, and what NOT to touch.
4. Constraints — the specific rules that apply (invoke rule, tokens, naming).
5. Verification — how to confirm done (lint, typecheck, test, manual check).
6. Acceptance — definition of "done."

# Handoff Protocol

- Human defines the small task and points the model at the rule file + relevant spec part.
- Model implements, runs the gate, fixes root causes, commits atomically.
- Human (or reviewer) checks the PR against the review checklist in [[GitWorkflow-Part03]].
- If the model diverges from architecture, the human returns it with the specific rule cited (e.g. "UI called invoke directly — see [[ArchitectureRules-Part01]]").

# Iteration Over Volume

Prefer many small, reviewed iterations over one massive generation. If a generation introduces architectural drift, revert and re-prompt with a tighter scope rather than patching around the mistake.

# Related Documents

- [[AIInstructions-Part01]]
- [[GitWorkflow-Part03]]
- [[TestingRules-Part01]]
