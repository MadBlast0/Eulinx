---
title: NodeArchitecture Specification - Part 02
status: draft
version: 1.0
tags:
  - workflow-engine
  - node-architecture
  - ports
related:
  - "[[06-workflow-engine/README]]"
  - "[[NodeArchitecture-Part01]]"
  - "[[EdgeTypes-Part01]]"
  - "[[NodeArchitecture-Diagrams]]"
---

# NodeArchitecture Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the Base Node Contract, and Invariants
Part 02 - Ports, Typed Inputs and Outputs, and the Port Compatibility Rules
Part 03 - The Node Lifecycle State Machine and State Transitions
Part 04 - Execution Isolation, Retries, Timeouts, and Resource Limits
Part 05 - Error Propagation to Downstream Nodes
Part 06 - The Node Kind Registry and Custom Plugin Node Registration
Diagrams - NodeArchitecture-Diagrams.md

# Purpose

Part 02 defines ports: the typed attachment points on a node through which data moves along edges.

If the base contract (Part 01) says a node is a pure function, then ports are its argument list and return list. A port has a name, a type drawn from the Eulinx type system, an optional default, and a cardinality (single value or collection). Edges connect an output port on one node to an input port on another, and [[EdgeTypes-Part01]] owns the rules for when that connection is legal. This part owns the port itself and the compatibility lattice that decides whether two ports may be connected at all.

# Port Anatomy

A port is described by:

- `portId`: a name unique within the node, such as `source` or `verdict`.
- `direction`: `in` for input ports, `out` for output ports.
- `valueType`: one of the Eulinx primitive or composite types (text, number, boolean, json, artifact-ref, worker-handle, tool-handle, bytes, any).
- `cardinality`: `single` or `many` (a collection arriving over fan-in or a for-each).
- `required`: whether the port must be satisfied before the node may run.
- `default`: an optional static value used when no edge feeds the port.

An input port that is `required` and has no incoming edge and no default is a fatal validation error. The engine MUST NOT dispatch a node whose required input is unsatisfied. This is the `port_unsatisfied` run failure kind from [[WorkflowEngine-Part01]].

# The Type Lattice

Ports are not strictly equal-typed. Eulinx uses a compatibility lattice so that, for example, a `number` may flow into an `any` port, and an `artifact-ref` may flow into a `verdict`'s evidence slot only when the edge is an `artifact` edge. The lattice rules:

- `any` accepts every type; every type may flow into `any`.
- `json` accepts `text` (parsed), `number`, `boolean`, and structured `json`.
- `text` accepts `number` and `boolean` by string coercion, but the coercion is explicit and recorded.
- `artifact-ref` accepts only a value produced by an `artifact` or `memory` edge; it is never synthesized from `text`.
- `worker-handle` and `tool-handle` accept only values produced by Worker or Tool nodes respectively.
- Coercion never loses information silently; a narrowing coercion that would drop data is rejected at validation time.

The compatibility check runs at graph validation (before the run) and again at edge-satisfaction time, because a runtime value may carry a richer type than the static port declared.

# Port Resolution and the RunContext

When a node becomes ready, the engine resolves each input port by looking up the `RunContext` key written by the upstream output port that the connecting edge names. The lookup key is the edge's target port id. If multiple edges feed the same input port (fan-in), the values are collected into the `many` cardinality slot in deterministic, sorted-by-source order. Resolution is a pure read of persisted context; it never calls the upstream node.

# Invariants

```text
A port name is unique within its node.
An input port is satisfied only by an edge from a compatible output port.
A required input port with no edge and no default fails validation.
Coercion is explicit, recorded, and never lossy.
Fan-in values are ordered by source nodeId, never by arrival.
Port types are checked at validation and re-checked at resolution.
```

# AI Notes

Do not let a node "reach around" a port to grab an upstream value by node id. Always resolve through the edge and the RunContext key. Direct reads bypass the type lattice and defeat determinism.

Do not make every port `any` to avoid compatibility errors. The lattice exists to catch wiring mistakes at validation time. An `any` port is a contract that says "I accept anything", which means the node handler must defend against everything. Prefer precise types.

Do not coerce silently. A `number` flowing into `text` is a real change of representation. Record it so Replay and the UI show what happened.

# Related Documents

- [[06-workflow-engine/README]]
- [[NodeArchitecture-Part01]]
- [[NodeArchitecture-Part03]]
- [[NodeArchitecture-Diagrams]]
- [[EdgeTypes-Part01]]
- [[EdgeTypes-Part04]]
- [[WorkflowEngine-Part05]]
