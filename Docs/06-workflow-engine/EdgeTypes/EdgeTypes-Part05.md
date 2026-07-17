---
title: EdgeTypes Specification - Part 05
status: draft
version: 1.0
tags:
  - workflow-engine
  - edge-types
  - validation
  - cardinality
related:
  - "[[06-workflow-engine/README]]"
  - "[[EdgeTypes-Part01]]"
  - "[[EdgeTypes-Part04]]"
  - "[[WorkflowEngine-Part02]]"
---

# EdgeTypes Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, Definition, Base Edge Object Model, States, Invariants
Part 02 - The Edge Kind Catalog: control, data, conditional, error edges
Part 03 - The Edge Kind Catalog: loop-back, artifact, memory, event edges
Part 04 - Ports, the Type Lattice, Coercion, and the Compatibility Algorithm
Part 05 - Cardinality, Transforms, the Two Validators, Illegal Configurations, Checklist, Examples
Part 06 - Edge Satisfaction, the Run-Time Resolver, and the Engine Integration
Diagrams - EdgeTypes-Diagrams.md

# Purpose

Part 05 defines edge cardinality, value transforms, the two validators (structural and semantic), the illegal configurations the engine must reject, and a validation checklist with examples.

# Cardinality

An edge connects one source port to one target port, but the number of values that travel can vary:

- `single` to `single`: one value, the common case.
- `many` to `single` (fan-in): multiple upstream nodes feed one target port; the values are collected into a collection, ordered by source `nodeId` for determinism ([[WorkflowEngine-Part01]]).
- `single` to `many` (fan-out / broadcast): one value is delivered to multiple target ports; each target receives its own copy.
- `many` to `many`: the cross product is not allowed; this is an illegal configuration (below).

The target port's `cardinality` field ([[NodeArchitecture-Part02]]) decides whether fan-in collects or rejects. A `single` target receiving multiple edges without `many` cardinality is an illegal configuration.

# Transforms

An edge may declare an optional `transform`: a named, pure function applied to the value as it crosses. Examples: `rename`, `pick(path)`, `flatten`, `coerce`. Transforms are pure and recorded. They never perform I/O or call a model. A transform that fails (e.g. `pick` on a missing path) fails the target node with a fatal `port_unsatisfied`-class error. Custom transforms are not user-supplied code; they are a fixed, audited set selected by name in config.

# The Two Validators

The engine runs two validators at graph-load:

- The structural validator checks the graph shape: no illegal cycles (except inside declared Loop nodes, see [[LoopNodes-Part01]]), every node has a path from an `Input`, every non-`Output` node has at least one outgoing edge or is intentionally terminal, and edge endpoints reference real ports. It also applies the compatibility algorithm from Part 04 to every edge.
- The semantic validator checks per-kind rules: a Builder is not wired straight to trusted state, a Condition's branches are all wired, a Merge's join set is satisfiable, a Loop's body is well-formed. It draws on each kind's rules in [[NodeTypes-Part01]].

Both must pass before the run enters `running`. A failure is `graph_invalid` (fail-closed).

# Illegal Configurations

The engine MUST reject:

- a control cycle not enclosed in a declared Loop node;
- a `single` target port fed by more than one edge without `many` cardinality;
- a `many` to `many` fan;
- an edge whose source and target types are incompatible and non-coercible;
- a lossy coercion request;
- an edge from a Condition branch port that lacks the selection flag;
- an edge that would let a Builder write trusted state without a Verifier and Merge;
- a Loop-back edge that targets a node outside the loop body.

# Validation Checklist and Examples

Checklist: ports exist; types compatible; cardinality legal; transforms named and pure; cycles legal; per-kind semantic rules pass; selection flags set on branch edges. Example of rejection: `Builder.artifactRef -> Merge.merged` is fine, but `Builder.artifactRef -> projectFile.write` (a hypothetical direct-write port) is rejected because no Verifier sits between. Example of acceptance: two Builders fan into one Merge's `many` input, ordered by `nodeId`.

# Invariants

```text
Fan-in collects into a many port, ordered by source nodeId.
many-to-many is illegal.
Transforms are a fixed pure set, never user code.
Both validators pass before the run starts.
An illegal configuration fails validation, never the run mid-flight.
Lossy coercion is rejected, not performed.
```

# AI Notes

Do not allow user-supplied transform code on an edge. An edge transform that can call a model or read a file is a hidden side channel that breaks determinism and isolation. Keep transforms to the fixed, audited set.

Do not skip the semantic validator because the structural one passed. Structural validity (shape) says nothing about whether a Builder is dangerously wired. Both layers are required.

Do not permit a `many`-to-`many` edge. The cross product is almost never intended and explodes node counts non-deterministically. Reject it at validation.

# Related Documents

- [[06-workflow-engine/README]]
- [[EdgeTypes-Part01]]
- [[EdgeTypes-Part04]]
- [[EdgeTypes-Part06]]
- [[EdgeTypes-Diagrams]]
- [[NodeArchitecture-Part02]]
- [[NodeTypes-Part01]]
- [[LoopNodes-Part01]]
- [[BuilderNodes-Part04]]
- [[WorkflowEngine-Part02]]
