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
  - "[Model-Part01]"
---

# Model Specification (Part 02)

## Model Registry

The Model Registry is the Runtime's authoritative catalog of every model available through configured Providers.

Responsibilities:

- Discover models
- Register models
- Validate metadata
- Track availability
- Publish capabilities
- Monitor health

---

## Discovery

Models are discovered:

- During Provider connection
- On manual refresh
- After Provider updates
- Periodically for dynamic Providers

The Runtime caches discovered metadata.

---

## Registration

Each Model MUST register:

- Model ID
- Provider ID
- Display Name
- Version
- Capability Set
- Context Window
- Status

Duplicate identifiers MUST be rejected within the same Provider.

---

## Availability

States:

- Available
- Initializing
- Busy
- Disabled
- Deprecated
- Unavailable

Only Available models are eligible for scheduling.

---

## Selection Metadata

The Registry exposes:

- Cost profile
- Latency estimate
- Context size
- Tool support
- Vision support
- Structured output support
- Reasoning capability

Workers never query the Registry directly.

---

## Events

- ModelDiscovered
- ModelRegistered
- ModelUpdated
- ModelDeprecated
- ModelUnavailable

## AI Notes

The Runtime resolves model requests through the Registry, keeping Workers independent from provider-specific implementations.

