---
title: MemoryRules - Part 01
status: draft
version: 1.0
tags: [memory, rules]
related:
  - "[[MemoryArchitecture-Part01]]"
---

# MemoryRules - Part 01

## Document Index

Part 01 - Non-Negotiable Memory Rules
Part 02 - Testing, Anti-Patterns, and Final Checklist

# Non-Negotiable Rules

Memory MUST be scoped.

Memory MUST respect Workspace boundaries.

Memory MUST NOT store raw secrets as ordinary memory.

Memory MUST be redacted before unsafe injection.

Memory MUST be deletable according to policy.

Memory SHOULD cite its source.

Memory SHOULD prefer summaries and artifact references over raw logs.

