---
title: Context Manager Part 03 - Compression and Budgets
status: draft
version: 1.0
tags:
  - runtime
  - context-manager
  - token-budget
related:
  - "[[Model-Part01]]"
  - "[[Memory-Part01]]"
---

# Context Manager Part 03 - Compression and Budgets

## Purpose

This part defines how ContextManager keeps context within model limits and cost budgets.

## Budget Inputs

```text
modelContextWindow
reservedOutputTokens
taskPriority
workspaceBudget
sessionBudget
workerBudget
```

## Compression Strategies

```text
extractive_summary
abstractive_summary
artifact_digest
file_excerpt
symbol_excerpt
recent_events_only
dependency_context
```

## Priority Order

When context must be reduced:

```text
1. Keep task instruction
2. Keep permission limits
3. Keep required artifacts
4. Keep directly affected file excerpts
5. Keep recent relevant events
6. Drop unrelated transcript
```

## AI Notes

Cheap models often fail from noisy context, not lack of intelligence. Smaller, cleaner packets are better.

