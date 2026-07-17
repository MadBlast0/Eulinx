---
title: WorkerTesting Specification - Part 04
status: draft
version: 1.0
tags:
  - testing
  - worker-testing
  - refinement
related:
  - "[[WorkerTesting-Part03]]"
  - "[[WorkerTesting-Part05]]"
---

# WorkerTesting Specification (Part 04)

## Document Index

Part 01 - Purpose, Determinism, and the Replay Harness
Part 02 - Lifecycle and Hierarchy Testing
Part 03 - Artifact, Verification, and Merge Testing
Part 04 - Refinement Loop and Orchestrator Testing
Part 05 - Failure, Recovery, and Chaos Testing

# Refinement Loop Testing

The refinement loop (Generate → Critic → Refine → Judge → repeat, per ChatHistory) MUST be tested against the four modes: Low, Medium, High, Ultra.

Cases to cover:

- Low = a single draft, no refine pass,
- Medium = up to 2 refine passes,
- High = up to 4 refine passes,
- Ultra = up to 8 refine passes with a stronger critic,
- the judge stops the loop early when no improvement is detected,
- a token/cost budget stops the loop and emits a budget-exceeded event,
- the loop works with any model profile (cheap generator + strong critic allowed).

Tests MUST assert the exact number of passes for a given Replay and mode, and that the accepted artifact equals the recorded one.

# Orchestrator Testing

Orchestrators plan and delegate; they MUST be tested for:

- breaking a goal into a checklist and assigning subtasks,
- delegating to Workers and collecting their artifacts,
- synthesizing a final result from worker outputs,
- respecting the concurrency limit of the plan (Free ~3, Plus ~10, Pro higher),
- refusing to delegate work the Worker lacks permission for.

# Cost and Budget Testing

Tests MUST assert per-run token/cost estimates are produced and that budgets are enforced by the Scheduler (see [[02-runtime/Scheduler-Part01]] if present).

# Related Documents

- [[10-ai-system/RefinementLoop-Part01]]
- [[WorkerTesting-Part02]]
