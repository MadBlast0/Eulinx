---
title: Builder Specification - Part 01
status: draft
version: 1.0
tags:
  - ai-system
  - builder
related:
  - "[[10-ai-system/README]]"
  - "[[Builder-Part02]]"
---

# Builder Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, and Artifact Production
Part 02 - Artifact Types and Structure
Part 03 - Builder Context and Prompting
Part 04 - Implementation Checklist and Future Expansion

# Purpose

The Builder is the artifact-producing AI worker. It turns intent, context, prior draft, and critic feedback into a concrete artifact: code, markdown, JSON, a plan, a patch, or another defined type.

The Builder MUST NOT mutate the project directly. It produces artifacts; the runtime `Merge Manager` applies them under locks.

# Philosophy

For a cheap model, the Builder is the "hands." It should be told exactly what to build, given the relevant context, and constrained to a single artifact type. Generality comes from the prompt, not from hardcoded roles.

# Artifact Production

A Builder run receives:

- the task or goal,
- the relevant upstream artifact(s),
- the prior draft (if any),
- the critic feedback (if any),
- scoped memory and tool descriptions,
- the active prompt template.

It returns one artifact plus a short change note.

# No Direct Mutation

This rule is non-negotiable. A Builder that writes to the workspace bypasses locks, conflicts, and verification. All output flows through `ArtifactManager` and `MergeManager`.

# Related Documents

- [[Builder-Part02]]
- [[RefinementLoop-Part03]]
- [[02-runtime/ArtifactManager/ArtifactManager-Part01]]
- [[02-runtime/MergeManager/MergeManager-Part01]]
