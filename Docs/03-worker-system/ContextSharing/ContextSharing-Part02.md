---
title: ContextSharing Specification - Part 02
status: draft
version: 1.0
tags:
  - worker-system
  - context-sharing
  - artifacts
related:
  - "[[ContextSharing-Part01]]"
---

# ContextSharing Specification (Part 02)

## Document Index

Part 01 - Purpose, Principles, and Sharing Model
Part 02 - Artifact-Based Sharing and Summaries
Part 03 - Channels, Permissions, and Boundaries
Part 04 - Events, UI, and Implementation Checklist

# Artifact-Based Sharing

Preferred sharing objects:

```text
plan artifact
patch artifact
review artifact
API contract artifact
test report artifact
summary artifact
handoff artifact
```

# Summaries

Summaries should include:

- what was learned
- decisions made
- files involved
- artifacts produced
- open questions
- next steps

# Bad Sharing

Avoid:

- entire terminal logs
- full raw chat histories
- unrelated memory
- stale plan versions
- sensitive values

# AI Notes

Context should be shaped for the receiving Worker’s task.

# Related Documents

- [[ContextSharing-Part03]]
- [[ArtifactManager-Part01]]

