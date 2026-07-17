---
title: WorkerTesting Specification - Part 01
status: draft
version: 1.0
tags:
  - testing
  - worker-testing
  - agents
related:
  - "[[16-testing/README]]"
  - "[[WorkerTesting-Part02]]"
  - "[[03-worker-system/README]]"
---

# WorkerTesting Specification (Part 01)

## Document Index

Part 01 - Purpose, Determinism, and the Replay Harness
Part 02 - Lifecycle and Hierarchy Testing
Part 03 - Artifact, Verification, and Merge Testing
Part 04 - Refinement Loop and Orchestrator Testing
Part 05 - Failure, Recovery, and Chaos Testing

# Purpose

WorkerTesting makes the AI runtime — Workers, Orchestrators, the refinement loop, and artifact flow — deterministically testable without calling a real model.

The central insight from [[04-memory/Replay/Replay-Part01]] is that any Worker execution can be recorded as a Replay and replayed exactly. WorkerTesting drives the runtime from Replays and seeded fakes so that "what the agent did" becomes a fixed, assertable input.

# Determinism First

A Worker test MUST NOT depend on a live model. The model provider is replaced by a scripted fake that yields the exact chunks recorded in the Replay. Given the same Replay, the runtime MUST produce the same artifacts, events, and final state every run.

# The Replay Harness

The harness MUST provide:

- a recorded session (events, worker transitions, artifact writes, memory reads) as a fixture,
- a driver that feeds the runtime the recorded model outputs in order,
- assertions on emitted events, produced artifacts, and final Worker/Task state,
- a diff mode that fails the test if the runtime diverges from the recorded outcome.

# What Worker Testing Owns

- Worker lifecycle and hierarchy transitions.
- Artifact production, verification, and merge.
- Refinement loop iteration and stopping rules.
- Orchestrator fan-out and progress aggregation.
- Failure, retry, and recovery behaviour.

# Related Documents

- [[WorkerTesting-Part02]]
- [[03-worker-system/WorkerLifecycle/WorkerLifecycle-Part01]]
- [[04-memory/Replay/Replay-Part01]]
