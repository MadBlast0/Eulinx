---
title: Critic Specification - Part 03
status: draft
version: 1.0
tags:
  - ai-system
  - critic
  - models
related:
  - "[[Critic-Part02]]"
  - "[[Critic-Part04]]"
---

# Critic Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, and Critic Output
Part 02 - Critique Dimensions and Structure
Part 03 - Critic Models and Prompting
Part 04 - Implementation Checklist and Future Expansion

# Model Selection

The Critic MAY use a different model profile than the Builder. Ultra mode SHOULD use a stronger critic profile. This is the "cheap generator + strong critic" pattern that is likely desirable (open question in the PRD).

# Prompting

The Critic is driven by a versioned prompt from `PromptOptimization` that specifies the dimensions, output schema, and severity rules. The Critic MUST NOT embed static prompt text in logic.

# Context for Critic

The Critic receives: the task, the artifact, the verification report, prior critic feedback, and relevant scoped memory. It does not receive unrelated worker transcripts.

# Avoiding Loops of Loops

The Critic itself does not run a refinement loop. It is a single pass per loop iteration. Over-critiquing wastes budget.

# Related Documents

- [[Critic-Part01]]
- [[ModelProfiles-Part01]]
- [[PromptOptimization-Part01]]
- [[RefinementLoop-Part02]]
