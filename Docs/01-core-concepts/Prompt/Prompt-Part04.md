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
  - "[Prompt-Part03]"
---

# Prompt Specification (Part 04)

## Prompt Profiles

A Prompt Profile is a reusable configuration that controls how prompts are built for different execution scenarios.

Profiles separate prompt behavior from prompt content.

Examples:

- Architecture
- Coding
- Reviewer
- Planner
- Research
- Documentation
- Testing
- Fast Execution
- Low Cost

---

## Profile Configuration

A profile MAY define:

- Preferred template
- Preferred model profile
- Temperature
- Max output tokens
- Context strategy
- Memory strategy
- Tool policy
- Output format
- Retry policy

Profiles SHOULD be reusable across Workspaces.

---

## Prompt Versioning

Every prompt template is versioned.

Version changes:

- Major → breaking changes
- Minor → compatible improvements
- Patch → fixes only

Historical Sessions MUST continue using their original versions for replay.

---

## Compatibility

The Runtime validates:

- Template version
- Required variables
- Model compatibility
- Tool compatibility
- Context limits

Invalid combinations MUST fail before inference.

---

## Events

- PromptProfileSelected
- PromptVersionResolved
- PromptCompatibilityValidated
- PromptReady

---

## AI Notes

Profiles standardize prompt behavior while versioning guarantees reproducibility and reliable replay.

