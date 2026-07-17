---
title: KnowledgeBase Specification - Part 03
status: draft
version: 1.0
tags:
  - features
  - knowledge-base
related:
  - "[[KnowledgeBase-Part02]]"
  - "[[KnowledgeBase-Part04]]"
  - "[[ContextInjection-Part01]]"
---

# KnowledgeBase Specification (Part 03)

## Document Index

Part 01 - Purpose, Scope, and the Knowledge Base Model
Part 02 - Ingestion and Chunking
Part 03 - Semantic Retrieval and Injection
Part 04 - Privacy, Scope, and AI Notes

# Semantic Retrieval

An agent queries the knowledge base with a natural-language question or task context. Retrieval blends vector similarity (LanceDB) with keyword search (Tantivy) and returns the top-ranked chunks with source references.

# Injection

Retrieved chunks are injected into the requesting worker's context through the ContextInjection pipeline: scope filter, permission filter, relevance ranking, redaction, then a context package. Long histories are summarized before injection to avoid context blow-up.

# Selective Injection

Like the memory bus, injection is selective: the agent gets the task plus relevant chunks plus the specific upstream output — not the entire corpus. Citations reference the source document so the agent can point the user to evidence.

# Related Documents

- [[KnowledgeBase-Part04]]
- [[ContextInjection-Part01]]
