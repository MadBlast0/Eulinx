---
title: MemorySpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - memory
related:
  - "[[01-core-concepts/README]]"
  - "[[Worker-Part01]]"
  - "[[Runtime-Part01]]"
  - "[[Workflow-Part01]]"
---

# Memory Specification (Part 01)

## Purpose

Memory enables Eulinx to retain, retrieve, and organize knowledge across execution without unnecessarily expanding AI context windows.

Memory is owned by the Runtime, not individual Workers.

---

## Philosophy

Memory should preserve useful knowledge while minimizing token usage.

Workers consume memory.

The Runtime manages memory.

---

## Memory Types

- Working Memory
- Task Memory
- Worker Memory
- Workspace Memory
- Session Memory
- Long-Term Knowledge
- Artifact References

Each type has different scope and lifetime.

---

## Responsibilities

Memory MUST:

- Belong to one Workspace
- Support semantic retrieval
- Be searchable
- Be versioned when appropriate
- Respect permission boundaries

Memory MUST NOT:

- Leak across Workspaces
- Store unrestricted secrets
- Bypass Runtime permissions

---

## Core Properties

- id
- workspaceId
- sessionId
- scope
- type
- source
- summary
- embeddings
- metadata
- createdAt
- updatedAt

---

## AI Notes

Memory exists to reduce repeated reasoning and preserve important information between execution stages.

