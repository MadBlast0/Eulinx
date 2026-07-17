---
title: AIArchitecture Specification - Part 01
status: draft
version: 1.0
tags:
  - ai-system
  - ai-architecture
related:
  - "[[10-ai-system/README]]"
  - "[[AIArchitecture-Part02]]"
---

# AIArchitecture Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, and the Reasoning vs Runtime Split
Part 02 - Orchestrator Hierarchy and Worker Roles
Part 03 - The Four Refinement Roles (Builder, Verifier, Critic, Judge)
Part 04 - Context Assembly and Memory Integration
Part 05 - Provider, Model, and Prompt Boundaries
Part 06 - Routing, Fallback, and Cost Integration
Part 07 - Determinism, Safety, and Human-in-the-Loop
Part 08 - Implementation Checklist and Future Expansion

# Purpose

AIArchitecture defines the overall shape of Eulinx's artificial intelligence subsystem.

It explains how the reasoning layer (Orchestrators, Workers, and the refinement roles) is organized on top of the deterministic runtime described in `02-runtime`, and how it consumes memory, providers, models, and prompts.

# Philosophy

Eulinx is designed around a cheap coding model. That means the system must be built so that *structure and iteration* do the heavy lifting, not single-shot brilliance.

The core belief behind this whole section:

```text
A weak model that iterates and is verified
beats a strong model that guesses once.
```

# Reasoning vs Runtime

Eulinx deliberately splits two responsibilities:

- The AI layer reasons, plans, and produces draft artifacts.
- The runtime layer authorizes, schedules, executes, locks, merges, and records.

This split is the single most important architectural rule in the AI system. It is echoed throughout `02-runtime` as the "reasoning vs authorization" principle.

```text
AI Layer
  reason, plan, draft
        |
        v
Runtime Layer
  authorize, schedule, execute, merge, record
```

# Why This Split Matters for Cheap Models

When reasoning is separated from execution, the cheap model is never trusted with unsafe authority. It proposes; the runtime disposes. A mistaken draft becomes a rejected artifact, not a deleted file.

# Related Documents

- [[AIArchitecture-Part02]]
- [[RefinementLoop-Part01]]
- [[02-runtime/README]]
- [[01-core-concepts/README]]
