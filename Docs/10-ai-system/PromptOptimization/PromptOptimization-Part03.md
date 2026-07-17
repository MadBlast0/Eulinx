---
title: PromptOptimization Specification - Part 03
status: draft
version: 1.0
tags:
  - ai-system
  - prompt-optimization
  - inheritance
related:
  - "[[PromptOptimization-Part02]]"
  - "[[PromptOptimization-Part04]]"
---

# PromptOptimization Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, and Prompt Library
Part 02 - Caching, Versioning, and Templating
Part 03 - Inheritance, Variables, and Resolution
Part 04 - Implementation Checklist and Future Expansion

# Inheritance

Prompts MAY inherit from a base prompt. A base "worker system" prompt defines global rules; role prompts extend it with role-specific instructions. Inheritance keeps shared rules consistent and reduces duplication.

# Variables

Standard variables include: task, goal, context_package, prior_draft, critic_feedback, verification_report, output_schema, and mode. The resolver validates required variables before sending the call.

# Resolution

When a role requests prompt id plus variables, the resolver returns the rendered prompt text with the cacheable prefix intact. Resolution is deterministic for a given version and variable set.

# Testing Prompts

Prompts SHOULD be testable: a prompt version can be run against a fixture and scored. This supports prompt experiments without changing role code.

# Related Documents

- [[PromptOptimization-Part01]]
- [[Builder-Part03]]
- [[Critic-Part03]]
- [[Judge-Part03]]
