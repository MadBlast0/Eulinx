---
title: ServiceAPI Specification - Part 04
status: draft
version: 1.0
tags:
  - api
  - service-api
  - rules
  - determinism
related:
  - "[[15-api/README]]"
  - "[[ServiceAPI-Part01]]"
  - "[[ServiceAPI-Part02]]"
  - "[[ServiceAPI-Part03]]"
  - "[[02-runtime/README]]"
  - "[[EventBus-Part01]]"
  - "[[RuntimeRules-Part01]]"
---

# ServiceAPI Specification (Part 04)

## Document Index

Part 01 - The internal service-to-service boundary, in-process calls, and service traits
Part 02 - The service call graph and who may call whom
Part 03 - The in-process message shapes and the no-Tauri rule
Part 04 - The service rules: deterministic, no LLM, business logic lives here

# Purpose

This part collects the hard rules of the ServiceAPI. These rules are what make Eulinx's runtime reliable and cheap to build: deterministic services, no LLM in the kernel, and business logic kept where the cheap coding model can write it. A violation is an architecture defect.

# The Rules

ServiceAPI calls MUST be in-process. No Tauri, no network, no serialization between services. See [[ServiceAPI-Part01]] and [[ServiceAPI-Part03]].

ServiceAPI MUST keep the runtime services deterministic. Given the same inputs and the same event order, a service MUST produce the same outputs and the same published events. This is what makes Replay correct ([[EventBus-Part05]]). A service MUST NOT read the wall clock for truth, MUST NOT use randomness except through an injected, replayable source, and MUST NOT call an LLM.

ServiceAPI MUST NOT call an LLM. Model calls, refinement loops, and orchestration plans belong to the AI/TS layer that issued the command. The runtime services do the mechanical work: schedule, lock, merge, verify, store, publish. See the AI-vs-runtime split in [[01-core-concepts/README]] and [[02-runtime/README]].

ServiceAPI MUST own the business logic that is not AI reasoning. Scheduling policy, lock acquisition, merge conflict resolution, permission evaluation, artifact versioning, and event publication are all here. The command handler is a thin façade ([[RustAPI-Part01]]); the logic is in the service.

ServiceAPI MUST keep state owned by exactly one service. No reach-in ([[ServiceAPI-Part02]]). A service asks another service through its trait; it does not read its fields.

ServiceAPI MUST publish facts through the EventBus, never by calling observers. The bus is a broadcast and a leaf in the call graph ([[ServiceAPI-Part02]], [[EventBus-Part01]]).

ServiceAPI MUST keep the call graph acyclic. No mutual calls between services; extract shared decisions into a third service or RuntimeRules ([[ServiceAPI-Part02]]).

ServiceAPI MUST NOT publish from inside a LockManager lock. Release the lock, then publish, or the bus and lock graph deadlock under load ([[EventBus-Part01]]).

ServiceAPI MUST map every error to a `ServiceError` with a stable `code`. No stringly errors; the code drives frontend branching and retries ([[ServiceAPI-Part03]], [[Contracts-Part05]]).

# The Business-Logic Location Rule

The recurring confusion this rule resolves: where does logic go? The answer, in priority order:

1. **Deterministic, mechanical, must-be-reliable** → a Rust runtime service (ServiceAPI). Examples: lock acquisition, merge, permission check, scheduling, verification.
2. **Orchestration, planning, AI reasoning, refinement** → the TypeScript/AI layer that issues commands. Examples: how many Workers to spawn, what prompt, what refinement mode, how to split a plan.
3. **Thin validation/authorization/translation** → the RustAPI command handler. No decisions, only checks and delegation.

This three-tier split is what lets the bulk of Eulinx be written in the language the cheap model handles best (TypeScript) while Rust stays a thin, reliable native kernel.

# AI Notes

Do not call an LLM from a service. If you need model output, the AI layer already produced it and passed it as command input. A service with an LLM client is no longer deterministic and breaks Replay.

Do not read the wall clock for truth in a service. Use an injected, replayable time source so Replay reconstructs state exactly.

Do not publish while holding a lock. Release first. The EventBus explicitly warns this deadlocks.

Do not put a decision in the command handler. The handler validates and delegates; the service decides.

Do not make the call graph cyclic. Mutual service calls are a refactor signal, not a feature.

# Related Documents

- [[15-api/README]]
- [[ServiceAPI-Part01]]
- [[ServiceAPI-Part02]]
- [[ServiceAPI-Part03]]
- [[02-runtime/README]]
- [[EventBus-Part01]]
- [[EventBus-Part05]]
- [[RuntimeRules-Part01]]
- [[RustAPI-Part01]]
- [[01-core-concepts/README]]
- [[Contracts-Part05]]
