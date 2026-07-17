---
title: PromptOptimization Specification - Part 02
status: draft
version: 1.0
tags:
  - ai-system
  - prompt-optimization
  - caching
related:
  - "[[PromptOptimization-Part01]]"
  - "[[PromptOptimization-Part03]]"
---

# PromptOptimization Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and Prompt Library
Part 02 - Caching, Versioning, and Templating
Part 03 - Inheritance, Variables, and Resolution
Part 04 - Implementation Checklist and Future Expansion

# Caching

Prompts are designed so the stable system portion is a cacheable prefix. Provider prompt caching keys on a consistent prefix, so repeated role calls (many workers, many loop passes) hit cache and cost less.

# Versioning

Every prompt has an immutable version. A role references a specific version so runs are reproducible. Editing a prompt creates a new version; old versions remain for replay and comparison.

# Templating

Prompts use a template syntax for variables (task, context, feedback, schema). The resolver fills variables at request time. Templates keep prompts DRY and avoid re-sending static text per call.

# Cost Interaction

Cached prefixes reduce token cost (see [[CostOptimization-Part02]]). Stable, versioned prompts are what make caching effective.

# Related Documents

- [[PromptOptimization-Part01]]
- [[CostOptimization-Part02]]
- [[04-memory/Replay/Replay-Part01]]
