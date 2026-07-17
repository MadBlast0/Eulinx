---
title: PromptSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - prompts
related:
  - "[[01-core-concepts/README]]"
  - "[Prompt-Part01]"
  - "[Prompt-Part02]"
---

# Prompt Specification (Part 03)

## Variables

Prompt templates support strongly typed variables.

Examples:

- Workspace
- Session
- Task
- Worker
- User Goal
- Memory References
- Artifact References
- Model Profile

Variables MUST be validated before prompt construction.

---

## Prompt Composition

Prompts are assembled from reusable sections.

Typical composition:

System Instructions
↓
Workspace Context
↓
Task Context
↓
Relevant Memory
↓
Artifacts
↓
User Request
↓
Execution Constraints

The Runtime is solely responsible for assembling the final prompt.

---

## Context Selection

The Runtime SHOULD include only information relevant to the active Task.

Selection considers:

- Semantic relevance
- Recency
- Permissions
- Workspace isolation
- Context window limits

Irrelevant context MUST be excluded.

---

## Prompt Constraints

Templates MAY define:

- Maximum context size
- Required variables
- Optional variables
- Allowed tools
- Required output format
- Validation rules

---

## Events

- PromptComposed
- VariablesResolved
- ContextInjected
- PromptBuilt

---

## AI Notes

Prompt composition should remain deterministic and reproducible.

Workers describe intent; the Runtime constructs the final prompt.

