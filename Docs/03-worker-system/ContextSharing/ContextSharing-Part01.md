---
title: ContextSharing Specification - Part 01
status: draft
version: 1.0
tags:
  - worker-system
  - context-sharing
related:
  - "[[ContextManager-Part01]]"
  - "[[ArtifactManager-Part01]]"
---

# ContextSharing Specification (Part 01)

## Document Index

Part 01 - Purpose, Principles, and Sharing Model
Part 02 - Artifact-Based Sharing and Summaries
Part 03 - Channels, Permissions, and Boundaries
Part 04 - Events, UI, and Implementation Checklist

# Purpose

ContextSharing defines how Workers share useful information without dumping entire chat or terminal histories into each other.

# Principle

Workers should share structured context:

- artifacts
- summaries
- task notes
- API contracts
- test reports
- patch references

They should avoid raw transcript flooding.

# Sharing Model

```text
Worker creates useful output
  |
  v
Artifact or summary is stored
  |
  v
ContextManager routes selected context
  |
  v
Receiving Worker gets scoped package
```

# AI Notes

Cheap models perform better with focused context packages than with huge messy transcripts.

# Related Documents

- [[ContextSharing-Part02]]
- [[ContextManager-Part01]]
- [[ArtifactManager-Part01]]

