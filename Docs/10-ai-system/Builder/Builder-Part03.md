---
title: Builder Specification - Part 03
status: draft
version: 1.0
tags:
  - ai-system
  - builder
  - prompting
related:
  - "[[Builder-Part02]]"
  - "[[Builder-Part04]]"
---

# Builder Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, and Artifact Production
Part 02 - Artifact Types and Structure
Part 03 - Builder Context and Prompting
Part 04 - Implementation Checklist and Future Expansion

# Context for Builder

The Builder receives its context package from the runtime `ContextManager`. It does not assemble context itself. The package is scoped so the Builder stays within its task's context window.

# Prompting

The Builder is driven by a versioned prompt from `PromptOptimization` that specifies the artifact type, output schema, constraints, and how to incorporate critic feedback. The Builder MUST NOT embed static prompt text in logic.

# Incorporating Feedback

On refine passes, the Builder receives the Critic's structured feedback and the Verifier's report. It SHOULD address blocker and major issues first, preserve strengths, and avoid regressions.

# Tool Use

The Builder MAY use tools (file read, shell, search) through the `ToolRegistry`, subject to its permission profile. Tool calls are mediated by the runtime, never direct OS access.

# Related Documents

- [[Builder-Part01]]
- [[PromptOptimization-Part01]]
- [[02-runtime/ContextManager/ContextManager-Part01]]
- [[02-runtime/ToolRegistry/ToolRegistry-Part01]]
