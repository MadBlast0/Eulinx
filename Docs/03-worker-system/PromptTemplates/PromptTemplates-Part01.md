---
title: PromptTemplates Specification - Part 01
status: draft
version: 1.0
tags:
  - worker-system
  - prompts
related:
  - "[[Prompt-Part01]]"
  - "[[WorkerCreation-Part01]]"
---

# PromptTemplates Specification (Part 01)

## Document Index

Part 01 - Purpose, Template Types, and Structure
Part 02 - Worker Instructions, Output Contracts, and Constraints
Part 03 - Variables, Versioning, Testing, and Reuse
Part 04 - UI, Events, and Implementation Checklist

# Purpose

PromptTemplates define reusable prompt structures for Workers and Orchestrators.

They help lower-cost models behave consistently.

# Template Types

```text
worker_task
worker_review
worker_repair
worker_handoff
orchestrator_plan
orchestrator_replan
verification
artifact_summary
```

# Template Object

```ts
type PromptTemplate = {
  id: string;
  name: string;
  type: string;
  version: number;
  body: string;
  variables: string[];
  outputContract?: string;
};
```

# AI Notes

Prompt templates should reduce ambiguity for cheap models by being explicit about task, context, permissions, output format, and stop condition.

# Related Documents

- [[PromptTemplates-Part02]]
- [[Prompt-Part01]]

