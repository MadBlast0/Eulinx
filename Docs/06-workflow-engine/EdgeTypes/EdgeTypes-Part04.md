---
title: EdgeTypes Specification - Part 04
status: draft
version: 1.0
tags:
  - workflow-engine
  - edge-types
  - ports
  - compatibility
related:
  - "[[06-workflow-engine/README]]"
  - "[[EdgeTypes-Part01]]"
  - "[[EdgeTypes-Part02]]"
  - "[[NodeArchitecture-Part02]]"
---

# EdgeTypes Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, Definition, Base Edge Object Model, States, Invariants
Part 02 - The Edge Kind Catalog: control, data, conditional, error edges
Part 03 - The Edge Kind Catalog: loop-back, artifact, memory, event edges
Part 04 - Ports, the Type Lattice, Coercion, and the Compatibility Algorithm
Part 05 - Cardinality, Transforms, the Two Validators, Illegal Configurations, Checklist, Examples
Part 06 - Edge Satisfaction, the Run-Time Resolver, and the Engine Integration
Diagrams - EdgeTypes-Diagrams.md

# Purpose

Part 04 defines the type system an Edge must obey: the port types at its ends, the compatibility lattice that decides whether a connection is legal, and the coercion rules that apply when types differ.

An Edge is only meaningful if its source output port and its target input port are compatible. This is checked twice: at graph-validation time (before the run) and at edge-resolution time (when a value actually flows), because a runtime value may carry a richer or narrower type than the static port declared. The engine's readiness computation ([[WorkflowEngine-Part03]]) depends on these checks being sound: an invalid edge that slips through can feed a node a value it cannot use, producing a non-deterministic or crashing run.

# The Port Type Lattice

The Eulinx value types form a lattice used by every edge:

- `any` sits at the top: every type flows into `any`, and `any` may flow into any port only when the target handler explicitly accepts `any`.
- `json` accepts `text` (parsed), `number`, `boolean`, and structured `json`.
- `text` accepts `number` and `boolean` by explicit string coercion.
- `artifact-ref` accepts only a value produced by an `artifact` or `memory` edge; it is never synthesized from `text` or `json`.
- `worker-handle` and `tool-handle` accept only handles produced by Worker or Tool nodes respectively.
- `bytes` accepts only `bytes`; it never coerces from `text`.

A connection is legal when the source port's type is a subtype of (or coercible to) the target port's type under these rules. The lattice is deliberately small so validation is fast and predictable.

# Coercion Rules

When the source type is not identical to the target but is coercible, the coercion is:

- explicit and recorded in the edge's resolution record (so Replay and the UI show what happened);
- never lossy; a coercion that would drop information is rejected at validation time, not silently performed;
- applied once, at the source, so the target node receives a value already in its declared type.

For example, a `number` flowing into a `text` port is string-coerced and the coercion is logged. A `json` flowing into `text` without an explicit parse step is rejected, because the string form is ambiguous.

# The Compatibility Algorithm

Given an edge from source port `S` to target port `T`, the algorithm is:

1. If `S.type == T.type`, accept (no coercion).
2. Else if `T.type == any`, accept (no coercion).
3. Else if `coercible(S.type, T.type)`, accept with recorded coercion.
4. Else reject: the edge is invalid (`graph_invalid`).

The algorithm runs at validation for every edge, and again at resolution with the runtime value's actual type. A static pass that succeeded may still fail at runtime if the value's concrete type is incompatible (e.g. `any` resolved to `bytes` into a `text` port); in that case the target node fails with `port_unsatisfied`-class error, treated as fatal.

# Invariants

```text
Every edge is checked for type compatibility at validation and at resolution.
artifact-ref flows only from artifact or memory edges.
Coercion is explicit, recorded, and never lossy.
A lossy coercion is rejected at validation.
handle types accept only their own kind of handle.
The compatibility algorithm is a pure function of (S.type, T.type).
```

# AI Notes

Do not make every port `any` to avoid compatibility errors. The lattice exists to catch wiring mistakes at validation. An `any` port is a contract that the handler must defend against every type.

Do not coerce silently. A `number` to `text` change is real and must be logged; silent coercion hides data-shape bugs that surface later as malformed downstream input.

Do not let `artifact-ref` be synthesized from `text`. An artifact reference is a store pointer, not a string. Allowing text to masquerade as a reference would let a node forge an artifact and bypass verification.

# Related Documents

- [[06-workflow-engine/README]]
- [[EdgeTypes-Part01]]
- [[EdgeTypes-Part02]]
- [[EdgeTypes-Part03]]
- [[EdgeTypes-Part05]]
- [[EdgeTypes-Diagrams]]
- [[NodeArchitecture-Part02]]
- [[WorkflowEngine-Part03]]
