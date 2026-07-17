---
title: TestingStrategy Specification - Part 02
status: draft
version: 1.0
tags:
  - testing
  - testing-strategy
related:
  - "[[TestingStrategy-Part01]]"
  - "[[TestingStrategy-Part03]]"
---

# TestingStrategy Specification (Part 02)

## Document Index

Part 01 - Philosophy, Test Pyramid, and Toolchain
Part 02 - Layer Responsibilities and What Is Tested Where
Part 03 - Test Environments, Fakes, and Fixtures
Part 04 - CI Gate Contract and Coverage Policy

# Layer Responsibilities

Each layer owns a distinct slice of confidence. A bug caught in a lower layer MUST NOT be left for an upper layer to find.

## Unit Layer

Owns pure logic with no cross-process dependency:

- Zustand stores and reducers (state transitions, selectors).
- Service modules that talk to a faked `invoke`.
- Pure helpers: merge logic, lock resolution, artifact patching, prompt templating, cost math.
- Rust command bodies and their error mapping.

## Integration Layer

Owns seams between independently tested units:

- A frontend service calling the real (in-test) Tauri command router with a stubbed Rust body.
- Rust command → SQLite round trip (schema, migrations, queries).
- EventBus publish/subscribe ordering across services.
- Memory injection pipeline from request → scope → permission → redact → package (see [[04-memory/ContextInjection-Part01]]).

## Worker Layer

Owns the AI runtime in a deterministic harness:

- Worker lifecycle transitions driven by a Replay rather than a live model.
- Artifact production, verification, and merge flow under controlled input.
- Refinement loop iteration counts and stopping rules.
- Orchestrator fan-out and progress aggregation.

## Performance Layer

Owns budgets:

- 60fps target means any single interaction-frame work MUST stay within 16ms.
- Canvas render cost at N nodes, terminal throughput, memory ceiling per workspace.

## Security Layer

Owns refusal:

- Permission denials on every capability.
- Plugin isolation boundaries.
- Secret redaction before memory injection.

## Regression Layer

Owns history:

- Replay of previously fixed bugs MUST remain green.
- Recorded performance budgets MUST not regress beyond tolerance.

# What Is NOT Tested Automatically

- Subjective visual polish and animation feel (covered by manual review only).
- Live third-party model quality (covered by sandbox replay, never by calling the real API in CI).

# Related Documents

- [[IntegrationTesting-Part01]]
- [[WorkerTesting-Part01]]
- [[PerformanceTesting-Part01]]
- [[SecurityTesting-Part01]]
