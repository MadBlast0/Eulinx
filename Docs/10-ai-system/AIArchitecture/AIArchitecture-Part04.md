---
title: AIArchitecture Specification - Part 04
status: draft
version: 1.0
tags:
  - ai-system
  - ai-architecture
  - context
related:
  - "[[AIArchitecture-Part03]]"
  - "[[AIArchitecture-Part05]]"
---

# AIArchitecture Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, and the Reasoning vs Runtime Split
Part 02 - Orchestrator Hierarchy and Worker Roles
Part 03 - The Four Refinement Roles (Builder, Verifier, Critic, Judge)
Part 04 - Context Assembly and Memory Integration
Part 05 - Provider, Model, and Prompt Boundaries
Part 06 - Routing, Fallback, and Cost Integration
Part 07 - Determinism, Safety, and Human-in-the-Loop
Part 08 - Implementation Checklist and Future Expansion

# Context Assembly

Every AI role receives a context package assembled by the runtime `ContextManager`. The AI subsystem MUST NOT assemble context itself; it requests it.

The context package for a Worker typically contains:

- the task or goal,
- the relevant upstream artifact(s),
- selected channel summaries,
- scoped memory (workspace, phase, task),
- available tool descriptions,
- the active prompt template,
- budget and mode metadata.

# Memory Integration

Memory is scoped. A frontend Worker MUST NOT receive backend memory unless explicitly relevant. Long histories are summarized before injection (RAG-style) to protect the context window and reduce token cost.

The AI subsystem reads memory through `MemoryManager` and never reads raw stores directly.

# Channels and "By the Way" Chat

Agents communicate through structured channels, not raw chat dumps. There are global channels (all roles may read/post) and partitioned channels (user-defined groups). Messages carry metadata (what was done, progress percent) so roles get signal without noise.

# Artifact Sharing

Roles exchange artifacts, not conversations. A Builder emits an artifact; the Critic receives the artifact plus the verification report. This scales far better than forwarding transcripts.

# Related Documents

- [[04-memory/ContextInjection/ContextInjection-Part01]]
- [[04-memory/MemoryArchitecture/MemoryArchitecture-Part01]]
- [[02-runtime/ContextManager/ContextManager-Part01]]
- [[RefinementLoop-Part01]]
