---
title: ContextInjection - Part 02
status: draft
version: 1.0
tags: [memory, context-injection, ranking]
related:
  - "[[ContextInjection-Part01]]"
---

# ContextInjection - Part 02

## Document Index

Part 01 - Purpose, Context Package, and Injection Pipeline
Part 02 - Selection, Ranking, and Token Budgeting
Part 03 - Redaction, Permissions, and Safety
Part 04 - UI, Testing, and Implementation Checklist

# Selection

Context candidates come from:

- task instructions
- Worker handoff
- relevant artifacts
- Workspace memory
- Knowledge Base
- vector retrieval
- recent events

# Ranking

Ranking factors:

- task relevance
- scope closeness
- recency
- importance
- reliability
- sensitivity
- token cost

# Token Budgeting

ContextManager should reserve budget for:

- system instructions
- task prompt
- critical constraints
- artifacts
- memory
- output instructions

# AI Notes

Never spend the whole context window on old memory. Leave room for the Worker to reason and produce output.

