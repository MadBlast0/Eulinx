---
title: ModelProfiles Specification - Part 02
status: draft
version: 1.0
tags:
  - ai-system
  - model-profiles
  - schema
related:
  - "[[ModelProfiles-Part01]]"
  - "[[ModelProfiles-Part03]]"
---

# ModelProfiles Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and Capability Tags
Part 02 - Profile Schema and Resolution
Part 03 - Routing, Fallback, and Latency
Part 04 - Implementation Checklist and Future Expansion

# Profile Schema

Each model profile records:

- id and display name,
- provider id,
- capability tags,
- context window size,
- pricing (input/output/cache per unit),
- latency class (fast/standard/slow),
- availability (online/offline),
- supported features (streaming, function calling, json mode).

# Resolution

When a role requests a capability set, the resolver returns the highest-priority profile matching the tags within budget and availability. Priority weights cost, capability fit, and latency.

# Overrides

A workspace, node, or task MAY pin a specific profile or disable certain providers. User configuration always wins over automatic resolution.

# Related Documents

- [[ModelProfiles-Part01]]
- [[CostOptimization-Part01]]
- [[PromptOptimization-Part01]]
