---
title: PromptSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - prompts
related:
  - "[[01-core-concepts/README]]"
  - "[[Worker-Part01]]"
  - "[[Runtime-Part01]]"
  - "[[Workflow-Part01]]"
---

# Prompt Specification (Part 01)

## Document Index

Part 01 — Purpose, Philosophy, Architecture
Part 02 — Prompt Registry & Templates
Part 03 — Variables, Context & Composition
Part 04 — Prompt Profiles & Versioning
Part 05 — Runtime Integration
Part 06 — Security & Validation
Part 07 — Metrics & Optimization
Part 08 — Database, UI & Implementation

---

# Purpose

A Prompt is a structured instruction package prepared by the Runtime for a Model.

Prompts are first-class runtime objects, not hardcoded strings.

---

# Philosophy

Workers express intent.

The Runtime builds prompts.

Models consume prompts.

Separating these responsibilities keeps prompts reusable, testable and versioned.

---

# Architecture

Worker
↓
Runtime
↓
Prompt Manager
↓
Prompt Builder
↓
Model

---

# Responsibilities

A Prompt MUST:

- be versioned
- support variables
- support composition
- reference artifacts and memory
- be reproducible

Workers MUST NOT manually concatenate prompt fragments.

---

# Core Properties

- id
- name
- version
- template
- variables
- profile
- tags
- metadata
- createdAt

## AI Notes

Prompt construction is owned by the Runtime through the Prompt Manager, ensuring consistency across every Provider and Model.

