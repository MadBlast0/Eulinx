---
title: ContextSharing Specification - Part 04
status: draft
version: 1.0
tags:
  - worker-system
  - context-sharing
  - implementation
related:
  - "[[ContextSharing-Part01]]"
---

# ContextSharing Specification (Part 04)

## Document Index

Part 01 - Purpose, Principles, and Sharing Model
Part 02 - Artifact-Based Sharing and Summaries
Part 03 - Channels, Permissions, and Boundaries
Part 04 - Events, UI, and Implementation Checklist

# Events

```text
context.share.requested
context.share.approved
context.share.denied
context.package.created
context.package.delivered
```

# UI

UI should show:

- what context a Worker received
- where it came from
- which artifacts were included
- what was excluded
- why context was denied

# Implementation Checklist

```text
[ ] Define context channels
[ ] Define context package
[ ] Add permission filtering
[ ] Add artifact routing
[ ] Add summary routing
[ ] Add UI inspector
[ ] Add tests for cross-task isolation
```

# Final AI Notes

Context sharing should make Workers smarter without making them noisy.

# Related Documents

- [[ContextSharing-Part01]]
- [[ContextManager-Part01]]

