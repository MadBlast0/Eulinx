---
title: Critic Specification - Part 01
status: draft
version: 1.0
tags:
  - ai-system
  - critic
related:
  - "[[10-ai-system/README]]"
  - "[[Critic-Part02]]"
---

# Critic Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, and Critic Output
Part 02 - Critique Dimensions and Structure
Part 03 - Critic Models and Prompting
Part 04 - Implementation Checklist and Future Expansion

# Purpose

The Critic reviews an artifact and produces structured, actionable feedback for the next Builder pass. The Critic does not decide pass/fail; that is the Judge's job. The Critic tells the Builder what to improve.

# Philosophy

For a cheap model, the Critic is the "second opinion" that compensates for weak first drafts. It is the reflection step that turns one-shot generation into iterative improvement.

# Critic Output

The Critic MUST return a structured feedback object, not free prose. Suggested fields:

- issues: list of problems, each with severity and location.
- strengths: what is already good (so the Builder does not regress).
- suggestions: concrete changes to make.
- questions: uncertainties that need user or context clarification.

# Relation to Verifier

The Critic consumes the Verifier's report when present. Objective failures are already concrete; the Critic focuses on quality, correctness-of-intent, clarity, and design, not on re-reporting build errors.

# Related Documents

- [[Critic-Part02]]
- [[RefinementLoop-Part03]]
- [[Verifier-Part01]]
- [[Judge-Part01]]
