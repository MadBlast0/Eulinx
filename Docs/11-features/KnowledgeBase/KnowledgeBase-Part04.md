---
title: KnowledgeBase Specification - Part 04
status: draft
version: 1.0
tags:
  - features
  - knowledge-base
related:
  - "[[KnowledgeBase-Part03]]"
  - "[[PermissionManager-Part01]]"
---

# KnowledgeBase Specification (Part 04)

## Document Index

Part 01 - Purpose, Scope, and the Knowledge Base Model
Part 02 - Ingestion and Chunking
Part 03 - Semantic Retrieval and Injection
Part 04 - Privacy, Scope, and AI Notes

# Privacy and Scope

A knowledge base respects workspace boundaries. A workspace-scoped base is not readable by another workspace's agents. Retrieval MUST NOT surface secrets by default; redaction applies before injection, and sensitive documents can be marked private.

# Deletion and Retention

Documents and their chunks MUST be deletable. Deleting a document removes its vectors and index entries. Retention follows the workspace's memory policy; forgettable on request.

# AI Notes

Do not inject entire documents; retrieve and rank chunks, then summarize.

Do not let one workspace's knowledge base leak into another workspace's context.

Do not skip redaction for "trusted" documents; treat all injected content as potentially sensitive.

Do not assume a single embedding provider; make it a setting.

# Related Documents

- [[PermissionManager-Part01]]
