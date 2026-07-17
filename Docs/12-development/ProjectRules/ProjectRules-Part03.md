---
title: ProjectRules Specification - Part 03
status: draft
version: 1.0
tags:
  - development
  - project-rules
related:
  - "[[12-development/README]]"
  - "[[ProjectRules-Part02]]"
  - "[[ProjectRules-Part01]]"
---

# ProjectRules Specification (Part 03)

## Document Index

Part 01 - Licensing, Ownership & Governance Docs
Part 02 - Environment, Secrets & Configuration
Part 03 - Contributor Expectations & Scope Safety

# Purpose

This part defines contributor expectations and the scope-safety principle that protects user projects. It binds humans and the AI model to the same behavioral contract.

# Contributor Expectations

- Every contributor (human or AI model) MUST follow the rules in this `12-development` section.
- Changes MUST pass the CI gate and the PR review checklist ([[GitWorkflow-Part03]]).
- Architecture changes MUST be proposed and reflected in the spec vault before or with the code.
- The cheap model is a contributor bound by the same rules; it is directed via [[AIInstructions-Part01]], not exempted.

# Scope Safety (MUST)

Eulinx agents and workers operate within the user's selected workspace folder by default. Code and file operations MUST NOT touch files outside the workspace unless the user explicitly grants it. This mirrors the product's "isolated workspace" promise and the permission model in the runtime sections.

# Human-in-the-Loop

Destructive or external actions (git push, delete, publish, external API calls) MUST require explicit user approval or a granted permission. The model MUST NOT auto-approve such actions.

# Quality Bar

- No feature ships without passing tests for its core logic ([[TestingRules-Part01]]).
- No feature ships violating the design-system-first or invoke rules.
- The bar is "reliable and reviewable by a cheap model," not "maximum cleverness."

# Related Documents

- [[ProjectRules-Part01]]
- [[ArchitectureRules-Part01]]
- [[AIInstructions-Part03]]
