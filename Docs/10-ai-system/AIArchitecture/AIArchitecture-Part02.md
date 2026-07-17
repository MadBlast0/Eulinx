---
title: AIArchitecture Specification - Part 02
status: draft
version: 1.0
tags:
  - ai-system
  - ai-architecture
  - orchestrator
related:
  - "[[AIArchitecture-Part01]]"
  - "[[AIArchitecture-Part03]]"
---

# AIArchitecture Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and the Reasoning vs Runtime Split
Part 02 - Orchestrator Hierarchy and Worker Roles
Part 03 - The Four Refinement Roles (Builder, Verifier, Critic, Judge)
Part 04 - Context Assembly and Memory Integration
Part 05 - Provider, Model, and Prompt Boundaries
Part 06 - Routing, Fallback, and Cost Integration
Part 07 - Determinism, Safety, and Human-in-the-Loop
Part 08 - Implementation Checklist and Future Expansion

# Orchestrator Hierarchy

Eulinx organizes AI work as a hierarchy, not as a flat pool of chatbots.

A User Goal enters a Root Orchestrator. The Root Orchestrator decomposes the goal into Phases. Each Phase is owned by a Phase Orchestrator. Each Phase Orchestrator decomposes its phase into Tasks, each owned by a Task Orchestrator. Tasks are executed by Workers.

```text
User
  |
  v
Root Orchestrator
  |
  +-- Phase Orchestrator A
  |      +-- Task Orchestrator
  |             +-- Worker
  |             +-- Worker
  +-- Phase Orchestrator B
         +-- Task Orchestrator
                +-- Worker
```

# What an Orchestrator Is

An Orchestrator is an AI role, not a personality. It does not have a fixed "research" or "planner" identity. Its behavior is determined by the prompt and the task it is given.

An Orchestrator owns:

- its slice of the plan,
- its workers,
- its memory scope,
- its task queue,
- its budget,
- its artifacts,
- its verification expectations.

This mirrors how a real organization delegates: the Root does not ask how line 24 was written; it asks whether Authentication is finished.

# Worker Roles

Workers are generic execution units. The same Worker becomes a "coder," "reviewer," or "tester" depending on the prompt it receives. The system MUST NOT hardcode worker personalities.

Workers run inside terminals (Rust PTY) managed by `ProcessLifecycle`, but the terminal is a view of the worker, not the worker itself.

# Dynamic Spawning

A Worker or Orchestrator MAY spawn more Workers when a subtask is discovered. This is what makes the graph grow live. Spawning is a request to the runtime, not a direct OS action.

# Reporting Hierarchy

Progress aggregates upward:

```text
Worker (45%)
  -> Task (73%)
    -> Phase (61%)
      -> Project (28%)
```

Each level summarizes; nothing spams the root with raw transcripts.

# Related Documents

- [[AIArchitecture-Part03]]
- [[Planning-Part01]]
- [[RefinementLoop-Part01]]
- [[02-runtime/WorkerSpawner/WorkerSpawner-Part01]]
