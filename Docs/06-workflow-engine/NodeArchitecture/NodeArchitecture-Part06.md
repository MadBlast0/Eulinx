---
title: NodeArchitecture Specification - Part 06
status: draft
version: 1.0
tags:
  - workflow-engine
  - node-architecture
  - registry
  - plugins
related:
  - "[[06-workflow-engine/README]]"
  - "[[NodeArchitecture-Part01]]"
  - "[[NodeTypes-Part01]]"
  - "[[NodeArchitecture-Part05]]"
---

# NodeArchitecture Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, the Base Node Contract, and Invariants
Part 02 - Ports, Typed Inputs and Outputs, and the Port Compatibility Rules
Part 03 - The Node Lifecycle State Machine and State Transitions
Part 4 - Execution Isolation, Retries, Timeouts, and Resource Limits
Part 05 - Error Propagation to Downstream Nodes
Part 06 - The Node Kind Registry and Custom Plugin Node Registration
Diagrams - NodeArchitecture-Diagrams.md

# Purpose

Part 06 defines the Node Kind Registry: the table that maps a `nodeKind` string to the handler and the schema that validates that kind's config and ports.

The registry is what makes the engine open to extension without modification. The built-in kinds (Worker, Orchestrator, Tool, Builder, Verifier, Condition, Loop, Merge, Artifact, Memory, MCP, Input, Output, Delay, Human-approval) are registered by the engine at startup. A plugin may register an additional kind. The engine itself never hard-codes behavior per kind; it asks the registry "what handler and what schema for this kind?" and trusts the answer. This keeps the dispatch path uniform and keeps the fail-closed rule enforceable: an unregistered kind is simply rejected.

# Registry Entry

Each registered kind provides:

- `kind`: the string used in `nodeKind`.
- `configSchema`: a validator that checks a node's config before the run starts.
- `portSchema`: the declared input and output ports for the kind (or a generator for parametric kinds).
- `handler`: the identifier the ExecutionEngine uses to select the adapter that runs this kind.
- `defaultPolicy`: default retry and timeout values, overridable per node.
- `isParametric`: whether port sets are computed from config (e.g. an MCP node's ports come from server schema, see [[MCPNodes-Part03]]).

# Registration Rules

A plugin registers a kind at load time. Registration MUST:

- use a namespaced `kind` string (e.g. `acme::translator`) so it cannot collide with built-ins;
- provide a complete `configSchema` and `portSchema`;
- declare its handler as an ExecutionEngine adapter, never as in-engine code;
- pass the engine's structural validation before the kind is usable in a graph.

A plugin MUST NOT register a kind that overrides a built-in kind. A duplicate registration is rejected. This protects the determinism and replay guarantees: a replay always uses the same kind set that produced the original run.

# Validation at Graph Load

Before a run starts, every node's `nodeKind` is resolved against the registry. An unresolved kind halts the run with `unknown_node_kind`. Then every node's config is validated against its kind's `configSchema`, and every edge is checked against port compatibility (Part 02). Only a fully validated graph enters the `running` state.

# Custom Node Handler Isolation

A plugin-provided handler is subject to the same isolation contract as built-ins (Part 04): it receives an `ExecutionRequest`, returns a `NodeResult`, reads only declared inputs, writes only declared outputs, and never touches trusted project state. A plugin that violates this contract is a security defect, not a feature.

# Invariants

```text
Every dispatched nodeKind is registered before the run starts.
An unregistered kind halts the run (fail-closed).
A plugin kind uses a namespaced string and never overrides a built-in.
A registered kind supplies configSchema, portSchema, and a handler adapter.
Config and ports are validated before the run enters running.
Replay uses the same kind set as the original run.
```

# AI Notes

Do not let the engine switch on `nodeKind` with a giant if-statement of built-in behaviors. That couples the engine to every kind and makes plugins impossible. Route everything through the registry and the ExecutionEngine adapter selected by handler id.

Do not let a plugin register a handler that runs inside the engine process. The whole point of the boundary is that handlers run under ExecutionEngine supervision with permission checks. An in-engine plugin handler defeats replay and isolation at once.

Do not allow kind re-registration to change a running graph's semantics. Kinds are fixed for the life of a run; the run froze its registry view at snapshot time, just as it froze its graph.

# Related Documents

- [[06-workflow-engine/README]]
- [[NodeArchitecture-Part01]]
- [[NodeArchitecture-Part05]]
- [[NodeArchitecture-Diagrams]]
- [[NodeTypes-Part01]]
- [[MCPNodes-Part01]]
- [[ExecutionEngine-Part01]]
- [[WorkflowEngine-Part02]]
