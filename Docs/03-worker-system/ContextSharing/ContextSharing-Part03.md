---
title: ContextSharing Specification - Part 03
status: draft
version: 1.0
tags:
  - worker-system
  - context-sharing
  - permissions
related:
  - "[[ContextSharing-Part02]]"
  - "[[Permission-Part01]]"
---

# ContextSharing Specification (Part 03)

## Document Index

Part 01 - Purpose, Principles, and Sharing Model
Part 02 - Artifact-Based Sharing and Summaries
Part 03 - Channels, Permissions, and Boundaries
Part 04 - Events, UI, and Implementation Checklist

# Channels

Context channels may be:

```text
parent_to_child
child_to_parent
sibling_summary
artifact_route
orchestrator_broadcast
workflow_edge
human_note
```

# Permissions

Context sharing must respect:

- Workspace boundary
- Task boundary
- Artifact sensitivity
- Memory sensitivity
- Worker permission profile

# Boundary Rule

A Worker should not receive context simply because it exists in the same Workspace.

There must be a relationship or route.

# AI Notes

Context sharing is not social chat between agents. It is controlled information routing.

# Related Documents

- [[ContextSharing-Part04]]
- [[Permission-Part01]]

