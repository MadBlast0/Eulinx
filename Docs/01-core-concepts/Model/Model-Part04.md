---
title: ModelSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - model
related:
  - "[[01-core-concepts/README]]"
  - "[Model-Part01]"
  - "[Model-Part03]"
---

# Model Specification (Part 04)

## Model Selection

The Runtime selects Models automatically unless the user explicitly pins one.

Selection factors:

- Required capabilities
- Context window
- Cost
- Latency
- Reliability
- Provider health
- Workspace preferences
- User overrides

Workers request capabilities, never specific model names.

---

## Model Profiles

Profiles define reusable configurations.

Examples:

- Fast Coding
- Deep Coding
- Architecture
- Research
- Planning
- Reviewer
- Documentation
- Cheap Execution

A profile may specify:

- Preferred providers
- Preferred models
- Temperature
- Max output
- Tool policy
- Retry policy

---

## Fallback Strategy

If the preferred Model is unavailable, the Runtime MAY:

1. Retry
2. Select an equivalent model
3. Select another provider
4. Pause execution
5. Request user approval

Fallbacks must preserve required capabilities.

---

## Workspace Overrides

Each Workspace may define:

- Default profile
- Allowed providers
- Blocked providers
- Cost limits
- Preferred reasoning level

---

## Events

- ModelSelected
- ModelFallback
- ModelPinned
- ModelProfileChanged

---

## AI Notes

Model selection is a Runtime optimization layer.

Workers remain provider-agnostic and model-agnostic.

