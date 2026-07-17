---
title: RefinementLoop Specification - Part 01
status: draft
version: 1.0
tags:
  - ai-system
  - refinement-loop
related:
  - "[[10-ai-system/README]]"
  - "[[RefinementLoop-Part02]]"
---

# RefinementLoop Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, and Loop Definition
Part 02 - Mode Model (Low / Medium / High / Ultra)
Part 03 - Phases: Builder, Verifier, Critic, Judge
Part 04 - Stopping Rules and Budgets
Part 05 - Pass Counting, UX, and Honest Claims
Part 06 - Failure Routing and Loop Exit
Part 07 - Implementation Checklist and Future Expansion

# Purpose

The Refinement Loop is Eulinx's signature feature. It is a control that sets how many critique-and-refine passes an artifact undergoes before acceptance, turning a rough base-model draft into a refined, higher-quality result.

It is the mechanism that lets a cheap coding model (DeepSeek V4 Flash) produce output that is measurably better per dollar than a single shot, without claiming to equal a flagship model.

# Philosophy

Iteration beats single-shot for weak models. Research (Self-Refine, Refine-n-Judge) shows meaningful quality gains from iterate-feedback loops and even stronger gains when a judge decides acceptance.

Eulinx packages this as a user-facing dial: the refinement slider.

# Loop Definition

A single refinement run for one artifact proceeds as:

```text
Generate (Builder) -> Verify (Verifier) -> Critique (Critic) -> Judge
        ^                                          |
        |                 reject                   |
        +------------------------------------------+
```

Repeat until the Judge accepts, the iteration cap is hit, or the budget is exhausted.

# What the Loop Is Not

The loop is not a magic quality multiplier. It cannot make a base model do what is fundamentally beyond it. The UX MUST state this honestly.

# Related Documents

- [[RefinementLoop-Part02]]
- [[AIArchitecture-Part03]]
- [[Builder-Part01]]
- [[Critic-Part01]]
- [[Judge-Part01]]
- [[Verifier-Part01]]
