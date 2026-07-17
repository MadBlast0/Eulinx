---
title: PromptTemplates Specification - Part 05
status: draft
version: 1.0
tags:
  - worker-system
  - prompt-templates
  - future
related:
  - "[[PromptTemplates-Part01]]"
---

# PromptTemplates Specification (Part 05)

## Document Index

Part 01 - Purpose, Template Types, and Structure
Part 02 - Worker Instructions, Output Contracts, and Constraints
Part 03 - Variables, Versioning, Testing, and Reuse
Part 04 - UI, Events, and Implementation Checklist
Part 05 - Injection Safety, Anti-Patterns, and Future Expansion

# Injection Safety

Prompt templates must not allow untrusted AI output to become system instruction text without review.

# Anti-Patterns

Avoid:

- vague Worker prompts
- no output contract
- huge context dumps
- hidden permissions
- unversioned template edits

# Future Expansion

Future capabilities:

- prompt template marketplace
- evals for templates
- model-specific variants
- automatic prompt linting

# Final AI Notes

Prompt templates are how Eulinx turns ambiguous work into reliable Worker instructions.

# Related Documents

- [[PromptTemplates-Part01]]
- [[Prompt-Part01]]

