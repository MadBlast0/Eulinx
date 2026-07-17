---
title: Judge Specification - Part 03
status: draft
version: 1.0
tags:
  - ai-system
  - judge
  - honesty
related:
  - "[[Judge-Part02]]"
  - "[[Judge-Part04]]"
---

# Judge Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, and Verdicts
Part 02 - Acceptance Criteria and Scoring
Part 03 - Judge Models and Honesty
Part 04 - Implementation Checklist and Future Expansion

# Model Selection

The Judge MAY use a stronger model profile than the Builder, especially in High and Ultra modes. A reliable Judge protects the user from accepting broken output.

# Honesty and Labeling

Judge output is a heuristic, not ground truth. The UX MUST label judge verdicts and scores as "suggested" when they are not backed by objective verification. Objective checks remain authoritative.

# Avoiding Bias

The Judge should compare against criteria, not against style preferences. Its prompt (from `PromptOptimization`) MUST define what "good" means for the task type.

# Budget Interaction

The Judge does not control the budget, but its verdict interacts with it: when budget is nearly exhausted, the Judge's accept decision becomes the safe exit path. The runtime enforces the final stop.

# Related Documents

- [[Judge-Part01]]
- [[ModelProfiles-Part01]]
- [[PromptOptimization-Part01]]
- [[RefinementLoop-Part04]]
