---
title: KnowledgeBase - Part 02
status: draft
version: 1.0
tags: [memory, knowledge-base, indexing]
related:
  - "[[KnowledgeBase-Part01]]"
---

# KnowledgeBase - Part 02

## Document Index

Part 01 - Purpose, Sources, and Knowledge Objects
Part 02 - Import, Parsing, Chunking, and Indexing
Part 03 - Retrieval, Citations, and Worker Use
Part 04 - Safety, UI, and Implementation Checklist

# Import Pipeline

```text
select source
  -> copy or reference
  -> parse
  -> chunk
  -> classify
  -> index
  -> make retrievable
```

# Parsing

Parsers should preserve:

- headings
- file paths
- links
- code blocks
- page numbers where available
- source metadata

