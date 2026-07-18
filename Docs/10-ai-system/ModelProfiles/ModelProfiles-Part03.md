---
title: ModelProfiles Specification - Part 03
status: draft
version: 1.0
tags:
  - ai-system
  - model-profiles
  - routing
  - flow:P11-PROV-MANAGER
related:
  - "[[ModelProfiles-Part02]]"
  - "[[ModelProfiles-Part04]]"
---

# ModelProfiles Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, and Capability Tags
Part 02 - Profile Schema and Resolution
Part 03 - Routing, Fallback, and Latency
Part 04 - Implementation Checklist and Future Expansion

# Routing

Roles do not choose models; they request capability. Routing is the resolver's job, informed by `CostOptimization` budget and `ModelProfiles` priority. This keeps role logic provider-agnostic.

# Fallback Chain

Each profile declares an ordered fallback chain. If the primary is unavailable, rate-limited, or errors, the system MUST try the next candidate before failing the task. The chain is ordered by capability then cost.

# Latency Awareness

Latency class informs routing for interactive roles (e.g., chat) versus batch roles (e.g., bulk coding). Fast profiles are preferred where responsiveness matters.

# Multi-Model Patterns

Ultra mode and the "cheap generator + strong critic" pattern are expressed as different profiles per role within the same loop, not as special-cased logic.

# Related Documents

- [[ModelProfiles-Part01]]
- [[CostOptimization-Part03]]
- [[AIArchitecture-Part06]]
- [[RefinementLoop-Part02]]
