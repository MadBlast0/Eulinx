---
title: AIArchitecture Specification - Part 03
status: draft
version: 1.0
tags:
  - ai-system
  - ai-architecture
  - refinement-roles
related:
  - "[[AIArchitecture-Part02]]"
  - "[[AIArchitecture-Part04]]"
---

# AIArchitecture Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, and the Reasoning vs Runtime Split
Part 02 - Orchestrator Hierarchy and Worker Roles
Part 03 - The Four Refinement Roles (Builder, Verifier, Critic, Judge)
Part 04 - Context Assembly and Memory Integration
Part 05 - Provider, Model, and Prompt Boundaries
Part 06 - Routing, Fallback, and Cost Integration
Part 07 - Determinism, Safety, and Human-in-the-Loop
Part 08 - Implementation Checklist and Future Expansion

# The Four Refinement Roles

The Refinement Loop is built from four distinct roles. Each role has one job. Mixing them is forbidden because it blurs accountability and makes cheap-model output harder to verify.

## Builder

Produces the artifact. Takes intent, context, prior draft, and feedback, and emits a concrete artifact (code, markdown, plan, patch, JSON). Never mutates the project directly.

See [[Builder-Part01]].

## Verifier

Checks the artifact objectively. Runs build, lint, tests, type-check, and any deterministic gate. Produces a verification report with pass/fail per check. May also run an optional semantic LLM check, but that check is labeled "suggested."

See [[Verifier-Part01]].

## Critic

Reviews the artifact and produces structured, actionable feedback. It does not decide pass/fail; it tells the Builder what to improve. Critic output feeds the next Builder pass.

See [[Critic-Part01]].

## Judge

Adjudicates. Compares the current artifact against criteria and prior candidates, then returns one of: accept, reject (continue loop), or stop (budget/iteration limit). The Judge's accept decision is what lets the artifact proceed to the runtime Merge Manager.

See [[Judge-Part01]].

# Role Separation Diagram

```text
Builder  -> produces draft
Verifier -> checks draft (objective)
Critic   -> critiques draft (feedback)
Judge    -> accept / reject / stop
```

# Why Four Roles and Not One

A single model asked to "write good code" has no internal accountability. Splitting the loop forces reflection (Critic), measurement (Verifier), and decision (Judge). This is what lets a cheap model self-improve across passes.

# Related Documents

- [[RefinementLoop-Part01]]
- [[Builder-Part01]]
- [[Verifier-Part01]]
- [[Critic-Part01]]
- [[Judge-Part01]]
