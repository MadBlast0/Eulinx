---
title: ProviderSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - provider
related:
  - "[[01-core-concepts/README]]"
  - "[Provider-Part01]"
  - "[Provider-Part03]"
---

# Provider Specification (Part 04)

## Model Discovery

The Runtime automatically discovers models exposed by each Provider.

Discovery SHOULD occur:

- During initial connection
- After authentication changes
- On manual refresh
- Periodically for dynamic providers

---

## Model Metadata

Each discovered model SHOULD expose:

- Model ID
- Display Name
- Context Window
- Input Modalities
- Output Modalities
- Streaming Support
- Tool Calling Support
- Vision Support
- Reasoning Support
- Provider Metadata

---

## Capability Mapping

The Runtime converts provider-specific features into standardized capabilities.

Examples:

- Chat
- Completion
- Vision
- Audio
- Embeddings
- Tool Calling
- Structured Output

Workers use capabilities rather than provider-specific APIs.

---

## Compatibility

Before scheduling a request, the Runtime verifies:

- Model availability
- Required capabilities
- Context limits
- Permission policies
- Workspace preferences

Incompatible models MUST be excluded.

---

## Discovery Events

- ModelsDiscovered
- ModelAdded
- ModelRemoved
- ModelUpdated
- CapabilityChanged

---

## AI Notes

Model discovery decouples the Runtime from provider-specific implementations, enabling interchangeable AI backends.

