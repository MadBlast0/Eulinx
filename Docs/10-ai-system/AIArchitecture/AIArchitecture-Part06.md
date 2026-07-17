---
title: AIArchitecture Specification - Part 06
status: draft
version: 1.0
tags:
  - ai-system
  - ai-architecture
  - routing
related:
  - "[[AIArchitecture-Part05]]"
  - "[[AIArchitecture-Part07]]"
---

# AIArchitecture Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, and the Reasoning vs Runtime Split
Part 02 - Orchestrator Hierarchy and Worker Roles
Part 03 - The Four Refinement Roles (Builder, Verifier, Critic, Judge)
Part 04 - Context Assembly and Memory Integration
Part 05 - Provider, Model, and Prompt Boundaries
Part 06 - Routing, Fallback, and Cost Integration
Part 07 - Determinism, Safety, and Human-in-the-Loop
Part 08 - Implementation Checklist and Future Expansion

# Routing

When a role needs a model, `ModelProfiles` selects a candidate by capability and cost. The AI subsystem requests a role-model binding at spawn time and may re-request a different profile for critic/judge within the same loop.

# Fallback

If the selected model is unavailable, rate-limited, or errors, the system MUST fall back along the configured chain before failing the task. Fallback is deterministic and ordered.

See [[ModelProfiles-Part03]] and [[CostOptimization-Part03]].

# Cost Integration

Every model call is metered by `CostOptimization`. The AI subsystem MUST consult the remaining budget before starting a loop pass. If a pass would exceed budget, the loop stops and the best current artifact is submitted to the Judge for a final accept decision.

See [[CostOptimization-Part01]].

# Concurrency and Queues

The runtime `Scheduler` controls how many Workers run concurrently per plan tier. The AI subsystem proposes work; the runtime decides when it executes. The AI subsystem MUST NOT assume unbounded parallelism.

# Related Documents

- [[CostOptimization-Part01]]
- [[ModelProfiles-Part01]]
- [[RefinementLoop-Part03]]
- [[02-runtime/Scheduler/Scheduler-Part01]]
