---
title: KnowledgeBase Specification - Part 01
status: draft
version: 1.0
tags:
  - features
  - knowledge-base
related:
  - "[[11-features/README]]"
  - "[[KnowledgeBase-Part02]]"
  - "[[VectorMemory-Part01]]"
---

# KnowledgeBase Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and the Knowledge Base Model
Part 02 - Ingestion and Chunking
Part 03 - Semantic Retrieval and Injection
Part 04 - Privacy, Scope, and AI Notes

# Purpose

The KnowledgeBase feature lets users upload documentation, PDFs, repositories, and notes so agents can retrieve from them with semantic search. It is the user's private reference library that makes workers more capable without flooding context windows.

The KnowledgeBase is built on VectorMemory (LanceDB) and search (Tantivy). It is a feature-layer surface over those memory systems, not a separate store.

# Scope

A knowledge base is scoped to a workspace by default, with an option for a global/user-level base. Content never leaves the device unless the user enables cloud sync, and retrieval respects workspace boundaries.

# The Knowledge Base Model

A knowledge base holds documents. A document carries:

- an id and source reference (path, URL, pasted note)
- a type (pdf, markdown, code repo, note)
- chunks (vector-embedded passages)
- metadata (title, tags, ingested-at)
- an access scope

# What KnowledgeBase Owns

The knowledge base feature owns:

- the ingestion UI and source management
- the chunking and embedding pipeline configuration
- the retrieval query surface agents use
- the injection rules into worker context

It does NOT own the vector store or the search engine; those are VectorMemory and the search service.

# Related Documents

- [[KnowledgeBase-Part02]]
- [[VectorMemory-Part01]]
