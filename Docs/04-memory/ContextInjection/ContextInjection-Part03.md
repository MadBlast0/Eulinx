---
title: ContextInjection - Part 03
status: draft
version: 1.0
tags: [memory, context-injection, safety]
related:
  - "[[Permission-Part01]]"
---

# ContextInjection - Part 03

## Document Index

Part 01 - Purpose, Context Package, and Injection Pipeline
Part 02 - Selection, Ranking, and Token Budgeting
Part 03 - Redaction, Permissions, and Safety
Part 04 - UI, Testing, and Implementation Checklist

# Permission Filtering

Before injection, Eulinx MUST confirm the target may read each memory, artifact, and file reference.

# Redaction

Redact:

- secrets
- API keys
- private tokens
- passwords
- irrelevant personal paths
- protected customer data

# Injection Safety

Do not inject:

- raw malicious instructions from external docs without labeling
- stale superseded plans
- rejected artifacts
- denied secrets

# AI Notes

Retrieved text is not always safe instruction. External and Worker-generated text should be labeled as context, not authority.

