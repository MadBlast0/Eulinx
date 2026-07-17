---
title: Builder Specification - Part 02
status: draft
version: 1.0
tags:
  - ai-system
  - builder
  - artifacts
related:
  - "[[Builder-Part01]]"
  - "[[Builder-Part03]]"
---

# Builder Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and Artifact Production
Part 02 - Artifact Types and Structure
Part 03 - Builder Context and Prompting
Part 04 - Implementation Checklist and Future Expansion

# Artifact Types

The Builder can produce any artifact type defined in `05-artifacts`. Common types:

- Code: source files or patches.
- Markdown: plans, docs, summaries.
- JSON: structured data or config.
- Plan: task checklists and decompositions.
- Patch: a diff-shaped change to apply via Merge Manager.
- Image / Diagram: when tools allow.

# Structure

Each artifact carries metadata: type, producer worker id, source task, parent artifact id (for revisions), and a change note. This lets the system track lineage and support replay.

# Patch vs Direct File

When the Builder edits code, it SHOULD emit a patch artifact rather than a full file when possible, so the Merge Manager can apply and conflict-check it. Full-file artifacts are acceptable for new files.

# Related Documents

- [[Builder-Part01]]
- [[05-artifacts/README]]
- [[02-runtime/MergeManager/MergeManager-Part01]]
