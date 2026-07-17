---
title: MemoryRules - Part 02
status: draft
version: 1.0
tags: [memory, rules, checklist]
related:
  - "[[MemoryRules-Part01]]"
---

# MemoryRules - Part 02

## Document Index

Part 01 - Non-Negotiable Memory Rules
Part 02 - Testing, Anti-Patterns, and Final Checklist

# Anti-Patterns

Avoid:

- one global memory blob
- injecting all history into every Worker
- storing terminal logs forever
- vector retrieval without permission filtering
- hidden memory users cannot inspect

# Testing

Test:

- cross-workspace isolation
- sensitive memory redaction
- deleted memory not retrieved
- stale vector index invalidation
- context budget limits

# Final AI Notes

Memory should make Eulinx wiser over time, not haunted by every old mistake.

