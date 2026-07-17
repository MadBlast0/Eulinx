---
title: AIArchitecture Specification - Part 07
status: draft
version: 1.0
tags:
  - ai-system
  - ai-architecture
  - safety
related:
  - "[[AIArchitecture-Part06]]"
  - "[[AIArchitecture-Part08]]"
---

# AIArchitecture Specification (Part 07)

## Document Index

Part 01 - Purpose, Philosophy, and the Reasoning vs Runtime Split
Part 02 - Orchestrator Hierarchy and Worker Roles
Part 03 - The Four Refinement Roles (Builder, Verifier, Critic, Judge)
Part 04 - Context Assembly and Memory Integration
Part 05 - Provider, Model, and Prompt Boundaries
Part 06 - Routing, Fallback, and Cost Integration
Part 07 - Determinism, Safety, and Human-in-the-Loop
Part 08 - Implementation Checklist and Future Expansion

# Determinism Where Possible

Anything that can be done algorithmically MUST be done by the runtime, not by an LLM. Scheduling, locking, merging, permission checks, and routing are deterministic. The AI layer is reserved for reasoning and generation.

# Safety Boundaries

AI roles operate under permission profiles. A Worker without write permission cannot produce an artifact that the Merge Manager will accept into protected paths. Permissions are evaluated by `PermissionManager`, never by the AI itself.

# Human-in-the-Loop

When a role is blocked, uncertain, or about to take a destructive action (push, delete, publish), it MUST request human approval through the runtime. The AI subsystem raises an approval request; it does not proceed silently.

# Honest UX

The AI subsystem MUST communicate honestly about its limits. A refined artifact is "higher-quality," not "equal to a flagship model." Some tasks a base model cannot do regardless of loop depth; the UX MUST say so.

# Related Documents

- [[02-runtime/PermissionManager/PermissionManager-Part01]]
- [[02-runtime/RuntimeRules/RuntimeRules-Part01]]
- [[RefinementLoop-Part05]]
- [[Verifier-Part01]]
