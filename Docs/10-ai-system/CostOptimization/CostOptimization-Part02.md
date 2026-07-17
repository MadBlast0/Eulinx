---
title: CostOptimization Specification - Part 02
status: draft
version: 1.0
tags:
  - ai-system
  - cost-optimization
  - tracking
related:
  - "[[CostOptimization-Part01]]"
  - "[[CostOptimization-Part03]]"
---

# CostOptimization Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and the Cost Model
Part 02 - Token and Cost Tracking
Part 03 - Budget Enforcement and Routing
Part 04 - Cost UX and Dashboards
Part 05 - Implementation Checklist and Future Expansion

# Tracking

Every AI call emits a cost record containing: timestamp, provider, model, role (builder/critic/judge/etc.), tokens in/out, cache tokens, estimated cost, and the owning task/worker ids.

# Cache Awareness

When prompt caching is active (see [[PromptOptimization-Part02]]), cache hit tokens are cheaper. Tracking MUST distinguish cached from uncached tokens so savings are visible and accurate.

# Persistence

Cost records are stored in SQLite and aggregated on demand. Historical cost powers dashboards and future routing improvements.

# Streaming

For streamed responses, cost is finalized when the stream completes; an estimate is shown live based on tokens seen so far.

# Related Documents

- [[CostOptimization-Part01]]
- [[PromptOptimization-Part02]]
- [[08-database/README]]
