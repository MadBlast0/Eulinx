---
title: MemoryManager Specification - Part 02
status: draft
version: 1.0
tags:
  - runtime
  - memory-manager
  - memory-scopes
related:
  - "[[MemoryManager-Part01]]"
  - "[[Memory-Part01]]"
---

# MemoryManager Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and Responsibilities
Part 02 - Memory Types, Stores, and Scope Boundaries
Part 03 - Read, Write, Summarization, and Retrieval
Part 04 - Vector Memory, Knowledge Base, and Indexing
Part 05 - Safety, Permissions, Retention, and Redaction
Part 06 - Implementation Checklist, Events, and Future Expansion

# Purpose

This part defines memory types and scope boundaries.

# Memory Types

Eulinx SHOULD support:

```text
workspace_memory
project_memory
session_memory
execution_memory
orchestrator_memory
task_memory
worker_memory
artifact_memory
tool_memory
temporary_memory
knowledge_memory
vector_memory
replay_memory
```

# Memory Record

```ts
type MemoryRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  sessionId?: string;
  executionId?: string;
  taskId?: string;
  workerId?: string;
  artifactId?: string;
  type: string;
  scopeType: string;
  scopeId: string;
  title?: string;
  content: string;
  contentType: "text" | "markdown" | "json" | "summary" | "embedding_ref";
  importance: "low" | "medium" | "high" | "critical";
  sensitivity: "public" | "internal" | "sensitive" | "secret";
  source: "user" | "worker" | "orchestrator" | "tool" | "runtime" | "import";
  createdAt: string;
  updatedAt: string;
};
```

# Workspace Memory

Workspace memory contains long-term information about the Workspace.

Examples:

- project conventions
- architecture decisions
- user preferences for the Workspace
- stable facts discovered during work

# Session Memory

Session memory is temporary and expires or is summarized after the Session ends.

Examples:

- what the user asked today
- current active plan
- temporary Worker coordination notes

# Task Memory

Task memory contains facts needed for one Task or Task group.

It should not automatically leak into unrelated Tasks.

# Worker Memory

Worker memory belongs to one Worker process.

Examples:

- current objective
- recent terminal summary
- local observations
- partial reasoning summaries

Worker memory should be archived or summarized when the Worker ends.

# Knowledge Memory

Knowledge memory comes from imported docs, codebase analysis, PDFs, websites, and repositories.

It is usually retrieved by semantic search.

# Scope Boundary Rules

Memory access MUST respect Workspace isolation.

Lower scope memory may be summarized upward, but raw lower scope memory should not be globally exposed without review.

Example:

```text
Worker Memory -> Task Summary -> Workspace Memory
```

# ASCII Scope Diagram

```text
Workspace
  Project
    Session
      Execution
        Orchestrator
          Task
            Worker
```

# AI Notes

Do not confuse memory scope with folder location.

Scope is about who should be allowed to retrieve and use the memory.

# Related Documents

- [[MemoryManager-Part03]]
- [[Memory-Part01]]
- [[Workspace-Part01]]
- [[Worker-Part04]]

