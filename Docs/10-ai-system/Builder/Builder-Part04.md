---
title: Builder Specification - Part 04
status: draft
version: 1.0
tags:
  - ai-system
  - builder
  - implementation
related:
  - "[[Builder-Part03]]"
---

# Builder Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, and Artifact Production
Part 02 - Artifact Types and Structure
Part 03 - Builder Context and Prompting
Part 04 - Implementation Checklist and Future Expansion

# Implementation Checklist

1. Define artifact output schema and metadata.
2. Request context package from `ContextManager`.
3. Resolve builder prompt by id and variables.
4. Generate artifact; never write to workspace directly.
5. Store artifact via `ArtifactManager` with lineage.
6. Attach change note and feedback resolution.
7. Emit builder event to the `EventBus`.

# Future Expansion

- Builder that proposes multiple candidate artifacts for the Judge to compare.
- Builder specialized by artifact type via prompt variants.
- Builder that self-checks before emitting (light internal verify).

# AI Notes

Do not let the Builder write files directly. Artifacts go through `ArtifactManager` and `MergeManager`.

Do not embed the prompt in code. Use `PromptOptimization` so it is cached and versioned.

Do not ignore critic feedback on refine passes. The loop exists to act on it.

# Related Documents

- [[Builder-Part01]]
- [[RefinementLoop-Part03]]
- [[Critic-Part01]]
