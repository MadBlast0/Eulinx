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
  - "[Model-Part02]"
---

# Model Specification (Part 03)

## Capabilities

Every Model advertises a standardized capability profile.

Examples:

- Chat
- Reasoning
- Tool Calling
- Vision
- Audio Input
- Audio Output
- Image Generation
- Embeddings
- Structured Output
- Function Calling

The Runtime schedules Models using capabilities rather than names.

---

## Context Window

Each Model declares:

- Maximum input tokens
- Maximum output tokens
- Combined context limit
- Recommended operating window

The Runtime MUST prevent requests that exceed supported limits.

---

## Reasoning Profiles

Suggested profiles:

- Fast
- Balanced
- Deep Reasoning
- Coding
- Research
- Planning

Profiles allow the Runtime to optimize execution without changing Worker logic.

---

## Compatibility

Before execution the Runtime validates:

- Required capabilities
- Context size
- Tool compatibility
- Provider availability
- Workspace policy

Incompatible Models MUST NOT be selected.

---

## Capability Updates

Capability changes trigger:

- ModelUpdated
- CapabilityChanged
- SchedulerRefresh

---

## AI Notes

Capabilities describe what a Model can do.

The Runtime decides which Model should perform a given task.

