---
title: WorkspaceMemory Specification - Part 01
status: draft
version: 1.0
tags:
  - memory
  - workspace-memory
related:
  - "[[Workspace-Part01]]"
  - "[[MemoryArchitecture-Part01]]"
---

# WorkspaceMemory Specification (Part 01)

## Document Index

Part 01 - Purpose, Contents, and Scope
Part 02 - Promotion, Retrieval, and User Editing
Part 03 - Safety, Implementation Checklist, and Future Expansion

# Purpose

WorkspaceMemory stores durable facts about one Workspace.

It should help future Sessions and Workers understand stable project context.

# Contents

WorkspaceMemory may include:

- architecture decisions
- coding conventions
- user preferences
- project rules
- stable summaries
- repeated lessons
- important artifact references

# Scope

WorkspaceMemory MUST NOT cross Workspace boundaries.

# Related Documents

- [[WorkspaceMemory-Part02]]
- [[Workspace-Part01]]

