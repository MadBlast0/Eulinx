---
title: KnowledgeBase Specification - Part 02
status: draft
version: 1.0
tags:
  - features
  - knowledge-base
related:
  - "[[KnowledgeBase-Part01]]"
  - "[[KnowledgeBase-Part03]]"
---

# KnowledgeBase Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and the Knowledge Base Model
Part 02 - Ingestion and Chunking
Part 03 - Semantic Retrieval and Injection
Part 04 - Privacy, Scope, and AI Notes

# Ingestion

Sources are ingested through the UI: a local file/folder picker (Rust dialog), a pasted note, or a repository path within the workspace. Ingestion reads through the FS service and respects `.gitignore` where relevant.

# Chunking

Each document is split into passages (chunks) of a bounded size with overlap. Code repos are chunked at semantic boundaries (file, symbol) where possible. Each chunk is embedded into the vector store and indexed by Tantivy for keyword search.

# Embedding

Embeddings are produced by a configured model (local or provider). The embedding model is a setting; the KnowledgeBase does not assume a specific provider. Large corpora are embedded incrementally and re-embedded only on version change.

# Related Documents

- [[KnowledgeBase-Part03]]
