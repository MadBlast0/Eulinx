---
title: KnowledgeBase - Part 01
status: draft
version: 1.0
tags: [memory, knowledge-base]
related:
  - "[[VectorMemory-Part01]]"
---

# KnowledgeBase - Part 01

## Document Index

Part 01 - Purpose, Sources, and Knowledge Objects
Part 02 - Import, Parsing, Chunking, and Indexing
Part 03 - Retrieval, Citations, and Worker Use
Part 04 - Safety, UI, and Implementation Checklist

# Purpose

KnowledgeBase stores external and project knowledge that Workers can retrieve.

Sources may include:

- docs
- PDFs
- repository files
- notes
- websites
- imported examples
- previous project artifacts

# Knowledge Object

```ts
type KnowledgeSource = {
  id: string;
  workspaceId: string;
  type: "file" | "folder" | "url" | "pdf" | "markdown" | "artifact";
  title: string;
  sourceRef: string;
  status: "imported" | "indexed" | "stale" | "failed";
};
```

