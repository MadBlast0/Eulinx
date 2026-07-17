---
title: VectorMemory - Part 03
status: draft
version: 1.0
tags: [memory, vector-memory, retrieval]
related:
  - "[[VectorMemory-Part02]]"
---

# VectorMemory - Part 03

## Document Index

Part 01 - Purpose, Embeddings, and Vector Records
Part 02 - Indexing Pipeline and Freshness
Part 03 - Hybrid Retrieval and Ranking
Part 04 - Safety, Implementation Checklist, and Future Expansion

# Hybrid Retrieval

Eulinx SHOULD combine:

- vector similarity
- keyword search
- scope filtering
- permission filtering
- recency
- artifact status
- source reliability

# Ranking

Relevant but unsafe results must be excluded or redacted.

High similarity does not override permissions.

