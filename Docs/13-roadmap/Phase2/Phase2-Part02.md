---
title: Phase2 Specification - Part 02
status: draft
version: 1.0
tags:
  - roadmap
  - phase2
  - sessions
  - worker-system
related:
  - "[[Phase2-Part01]]"
  - "[[Phase2-Part03]]"
---

# Phase2 Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and Spawner
Part 02 - Session System and Worker System
Part 03 - Memory System, Completion, and Handoff

# Session System

A Session is a scoped conversation/execution context. The Session System creates, persists, snapshots, and resumes sessions.

Sessions support branching (explore an alternate approach without losing the main line) and replay (re-run a session's steps for debugging). See [[04-memory/Replay/Replay-Part01]].

Session context is injected into workers selectively — never the full transcript — to avoid context blow-up (the core problem from [[04-memory/README]]).

# Worker System

The Worker System is the heart. It manages the full worker lifecycle:

Created → Initializing → Idle → Planning → Working → Waiting → Needs Human → Blocked → Completed → Archived → Destroyed.

Workers communicate through the Event Bus and through shared channels (global + partitioned) carrying metadata-rich "by the way" notes, not raw transcripts.

Worker health and recovery: a stuck worker is detected and restarted or destroyed by the Spawner/Worker Manager.

Worker scaling and pools: the system can grow or shrink the worker population based on load and plan limits.

Worker coordination: workers exchange artifacts and status via the runtime, with context isolation per worker for reliability.

# Worker Communication Model

Workers do NOT chat full transcripts to each other. They publish to channels and pass artifacts. Selective injection (via ContextManager, Phase 3) assembles the right context for each worker.

This is what makes "terminals know what each other is doing" actually work without exploding token cost.

# Related Documents

- [[Phase2-Part03]]
- [[Phase2-Part01]]
- [[03-worker-system/README]]
- [[04-memory/README]]
