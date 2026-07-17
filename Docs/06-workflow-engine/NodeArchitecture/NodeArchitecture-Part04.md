---
title: NodeArchitecture Specification - Part 04
status: draft
version: 1.0
tags:
  - workflow-engine
  - node-architecture
  - isolation
  - retries
related:
  - "[[06-workflow-engine/README]]"
  - "[[NodeArchitecture-Part01]]"
  - "[[NodeArchitecture-Part03]]"
  - "[[ExecutionEngine-Part01]]"
---

# NodeArchitecture Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, the Base Node Contract, and Invariants
Part 02 - Ports, Typed Inputs and Outputs, and the Port Compatibility Rules
Part 03 - The Node Lifecycle State Machine and State Transitions
Part 04 - Execution Isolation, Retries, Timeouts, and Resource Limits
Part 05 - Error Propagation to Downstream Nodes
Part 06 - The Node Kind Registry and Custom Plugin Node Registration
Diagrams - NodeArchitecture-Diagrams.md

# Purpose

Part 04 defines the execution isolation guarantees every node enjoys, and the retry and timeout policy every node carries.

Isolation is what lets the WorkflowEngine run branches in parallel without them corrupting each other. Because a node reads only its declared input ports and writes only its declared output ports, two nodes running at the same time cannot share memory accidentally. The ExecutionEngine provides the process and permission boundary; NodeArchitecture declares the contract that makes that boundary sufficient.

# Execution Isolation

A node handler runs with:

- No access to the graph. The handler receives an `ExecutionRequest`, not a graph reference.
- No access to other nodes' RunContext keys. It sees only the keys its input ports resolved to.
- No write access to trusted project state. Outputs are Artifacts or values held in the RunContext; they become project state only through the [[MergeManager-Part01]] after verification.
- A permission decision evaluated per execution by the [[PermissionManager-Part01]], based on the node kind and config.

This isolation is what the [[WorkflowEngine-Part01]] "MUST NOT let node handlers read or write global state" rule protects. A node that violates isolation is a bug even if it "works", because it breaks replay: a recorded result no longer captures everything the handler observed.

# Retry Policy

Every node carries a retry policy with these fields:

- `maxAttempts`: how many times the handler may be re-dispatched after a retryable failure. Default 1 (no retry) for most kinds; Worker kinds may default higher.
- `backoff`: the wait between attempts, fixed or exponential, derived deterministically from `determinismSeed`.
- `retryableErrors`: the set of failure kinds that warrant a retry (transient execution errors, timeouts). Fatal errors (unknown kind, invalid config, port unsatisfied) are never retried.

A retried node transitions `failed -> ready` internally and is re-dispatched with the same `iterationIndex`. Its previous attempt's outputs are discarded. The attempt count is persisted so recovery knows how many attempts remain.

# Timeout Policy

Every node carries a `timeoutMs`. When the ExecutionEngine supervises the execution, it enforces the timeout. A timeout is a retryable error up to `maxAttempts`; once attempts are exhausted, the node becomes `failed` with a terminal timeout failure. Timeouts are measured against wall-clock supervision inside the ExecutionEngine, not inside the engine tick, so a hung node does not block the tick loop.

# Resource Limits

Certain node kinds may declare resource hints (memory ceiling, token budget, terminal count) consumed by the [[Scheduler-Part01]] when admitting the node. These are hints, not guarantees; the Scheduler makes the final admission decision as stated in [[WorkflowEngine-Part01]].

# Invariants

```text
A node reads only declared input ports.
A node writes only declared output ports.
A node never writes trusted project state directly.
Fatal errors are never retried.
Retry attempts share the same iterationIndex.
Attempt count is persisted for recovery.
Timeout is enforced by the ExecutionEngine, not the tick loop.
Permission is evaluated per execution, not per node definition.
```

# AI Notes

Do not put retry logic in the WorkflowEngine tick. Retries belong to the node policy evaluated with the ExecutionEngine result. The engine only sees "failed, retryable, attempts remain" and re-dispatches. Keeping retry in the engine couples it to the tick and breaks the pure-function model.

Do not let a retried node keep its old outputs. A retry is a fresh execution; the prior attempt's values are discarded. Mixing them produces non-deterministic downstream input.

Do not make every node infinitely retryable. A `port_unsatisfied` or `unknown_node_kind` failure is a design error, not a transient one. Retrying it wastes time and obscures the real fault.

# Related Documents

- [[06-workflow-engine/README]]
- [[NodeArchitecture-Part01]]
- [[NodeArchitecture-Part03]]
- [[NodeArchitecture-Part05]]
- [[ExecutionEngine-Part01]]
- [[PermissionManager-Part01]]
- [[Scheduler-Part01]]
- [[MergeManager-Part01]]
