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
  - "[Prompt-Part04]"
---

# Prompt Specification (Part 05)

## Runtime Integration

The Runtime is solely responsible for constructing, validating, executing and recording prompts.

Execution Flow

Worker
↓
Runtime
↓
Prompt Manager
↓
Prompt Builder
↓
Context Builder
↓
Provider
↓
Model
↓
Response

---

## Prompt Builder

The Prompt Builder combines:

- Template
- Variables
- Workspace settings
- Session data
- Task details
- Memory
- Artifact references
- Output constraints

The resulting prompt is immutable for that execution.

---

## Context Budget

Before sending a prompt, the Runtime:

- Estimates token usage
- Removes low-priority context
- Preserves required sections
- Ensures model limits are respected

---

## Response Association

Every response links back to:

- Prompt version
- Prompt profile
- Session
- Task
- Worker
- Model
- Provider

This enables replay and auditing.

---

## Runtime Events

- PromptRequested
- PromptBuilt
- PromptSent
- PromptCompleted
- PromptCancelled
- PromptFailed

---

## AI Notes

Prompt execution is a Runtime responsibility.

Workers express intent; the Runtime transforms that intent into reproducible prompts.

