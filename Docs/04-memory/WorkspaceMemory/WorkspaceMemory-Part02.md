---
title: WorkspaceMemory Specification - Part 02
status: draft
version: 1.0
tags:
  - memory
  - workspace-memory
related:
  - "[[WorkspaceMemory-Part01]]"
---

# WorkspaceMemory Specification (Part 02)

## Document Index

Part 01 - Purpose, Contents, and Scope
Part 02 - Promotion, Retrieval, and User Editing
Part 03 - Safety, Implementation Checklist, and Future Expansion

# Promotion

Lower-scope memory may be promoted to WorkspaceMemory only when durable.

Examples:

- "Project uses Zustand for global state."
- "Do not edit generated API client directly."
- "Tests run with pnpm test."

# Retrieval

WorkspaceMemory should be retrieved when:

- creating a Session
- spawning major Workers
- generating context packages
- creating project plans

# User Editing

Users should be able to inspect, edit, pin, or delete WorkspaceMemory.

# Related Documents

- [[WorkspaceMemory-Part03]]
- [[ContextInjection-Part01]]

