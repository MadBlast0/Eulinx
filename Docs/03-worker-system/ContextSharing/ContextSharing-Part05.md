---
title: ContextSharing Specification - Part 05
status: draft
version: 1.0
tags:
  - worker-system
  - context-sharing
  - diffing
related:
  - "[[ContextSharing-Part01]]"
---

# ContextSharing Specification (Part 05)

## Document Index

Part 01 - Purpose, Principles, and Sharing Model
Part 02 - Artifact-Based Sharing and Summaries
Part 03 - Channels, Permissions, and Boundaries
Part 04 - Events, UI, and Implementation Checklist
Part 05 - Context Diffing, Redaction, and Compression
Part 06 - Examples, Anti-Patterns, and Future Expansion

# Context Diffing

Context diffing shows what changed since the last package.

Example:

```text
New:
- API Contract v3
- Test failure artifact

Removed:
- API Contract v2
```

# Redaction

Context sharing must redact sensitive values before delivery.

# Compression

Large context should be compressed through summaries and artifact references.

# AI Notes

Context diffing helps cheap models avoid rereading old information and missing the new bit that matters.

# Related Documents

- [[ContextSharing-Part06]]
- [[ContextManager-Part01]]

