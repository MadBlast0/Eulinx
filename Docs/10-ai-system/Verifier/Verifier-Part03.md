---
title: Verifier Specification - Part 03
status: draft
version: 1.0
tags:
  - ai-system
  - verifier
  - semantic
related:
  - "[[Verifier-Part02]]"
  - "[[Verifier-Part04]]"
---

# Verifier Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, and Objective Checks
Part 02 - Verification Report and Checks
Part 03 - Semantic Verification and Labeling
Part 04 - Implementation Checklist and Future Expansion

# Semantic Verification

The Verifier MAY run an LLM-based semantic check: "does this code meet the intent?" This is heuristic. Its output MUST be clearly labeled "suggested" and MUST NOT block merging on its own.

# Why Label It

Users and the Judge must not confuse a semantic opinion with a compile error. The PRD explicitly requires labeling judge/critic output as suggested, and the same rule applies here.

# When to Use

Semantic checks are useful when objective checks pass but intent is ambiguous. They inform the Critic and Judge but never act as a hard gate.

# Related Documents

- [[Verifier-Part01]]
- [[Critic-Part01]]
- [[Judge-Part03]]
- [[RefinementLoop-Part03]]
