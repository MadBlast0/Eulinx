---
title: ContextInjection - Part 01
status: draft
version: 1.0
tags: [memory, context-injection]
related:
  - "[[ContextManager-Part01]]"
  - "[[MemoryArchitecture-Part01]]"
---

# ContextInjection - Part 01

## Document Index

Part 01 - Purpose, Context Package, and Injection Pipeline
Part 02 - Selection, Ranking, and Token Budgeting
Part 03 - Redaction, Permissions, and Safety
Part 04 - UI, Testing, and Implementation Checklist

# Purpose

ContextInjection defines how memory, artifacts, prompts, files, and task instructions become the actual context given to a Worker or Orchestrator.

# Context Package

```ts
type ContextPackage = {
  id: string;
  workspaceId: string;
  targetType: "worker" | "orchestrator" | "tool" | "workflow_node";
  targetId: string;
  promptRefs: string[];
  memoryRefs: string[];
  artifactRefs: string[];
  fileRefs: string[];
  summary: string;
  tokenEstimate: number;
  createdAt: string;
};
```

# Pipeline

```text
Request context
  -> collect candidates
  -> filter permissions
  -> rank relevance
  -> redact
  -> compress
  -> assemble package
  -> inject
```

# AI Notes

Context injection is where cheap models either become useful or get buried. Keep packages focused.

