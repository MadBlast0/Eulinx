---
title: AIArchitecture Specification - Part 08
status: draft
version: 1.0
tags:
  - ai-system
  - ai-architecture
  - implementation
related:
  - "[[AIArchitecture-Part07]]"
---

# AIArchitecture Specification (Part 08)

## Document Index

Part 01 - Purpose, Philosophy, and the Reasoning vs Runtime Split
Part 02 - Orchestrator Hierarchy and Worker Roles
Part 03 - The Four Refinement Roles (Builder, Verifier, Critic, Judge)
Part 04 - Context Assembly and Memory Integration
Part 05 - Provider, Model, and Prompt Boundaries
Part 06 - Routing, Fallback, and Cost Integration
Part 07 - Determinism, Safety, and Human-in-the-Loop
Part 08 - Implementation Checklist and Future Expansion

# Implementation Checklist

The AI subsystem SHOULD be implemented in this dependency order:

1. Provider and model abstraction (`ModelProfiles`, provider interface).
2. Prompt templating and caching (`PromptOptimization`).
3. Context assembly hook into `ContextManager`.
4. Builder role producing artifacts via `ArtifactManager`.
5. Verifier running objective checks.
6. Critic feedback generation.
7. Judge adjudication and stopping rule.
8. Refinement Loop orchestration tying the four roles together.
9. Planning and decomposition.
10. Cost tracking and budget enforcement.

# Future Expansion

- Multi-model critic/judge: a cheap generator paired with a stronger critic (open question in the PRD, likely yes).
- Simulation mode: run the loop without applying artifacts to preview outcomes.
- Learned routing: adjust model profiles based on historical pass rates.
- Cross-project prompt libraries shared through the marketplace.

# AI Notes

Do not build the AI subsystem as one monolith. Each role is a small, independently testable unit driven by a prompt and a context package.

Do not let a cheap model decide its own safety. Safety is a runtime concern.

Do not skip the Judge. A loop without a stopping rule will burn tokens forever.

# Related Documents

- [[RefinementLoop-Part01]]
- [[Planning-Part01]]
- [[CostOptimization-Part01]]
- [[ModelProfiles-Part01]]
- [[PromptOptimization-Part01]]
