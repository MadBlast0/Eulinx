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
  - "[Prompt-Part01]"
---

# Prompt Specification (Part 02)

## Prompt Registry

The Prompt Registry stores every reusable prompt template known to the Runtime.

Responsibilities:

- Registration
- Discovery
- Version tracking
- Template validation
- Tagging
- Deprecation management

---

## Template Structure

Each template contains:

- Identifier
- Name
- Version
- Description
- Variables
- Sections
- Constraints
- Metadata

Templates SHOULD be immutable after publication.

---

## Discovery

The Runtime locates prompts by:

- Capability
- Worker type
- Task type
- Tags
- Profile
- Version

Workers request capabilities, not template names.

---

## Categories

Examples:

- Planning
- Coding
- Reviewing
- Research
- Documentation
- Testing
- Refactoring
- Orchestration

---

## Versioning

Prompt versions SHOULD preserve compatibility.

Breaking changes create a new major version.

Older Sessions continue referencing historical versions.

---

## Events

- PromptRegistered
- PromptUpdated
- PromptDeprecated
- PromptSelected
- PromptValidated

## AI Notes

The Prompt Registry is the single source of truth for reusable prompt templates across the Runtime.

