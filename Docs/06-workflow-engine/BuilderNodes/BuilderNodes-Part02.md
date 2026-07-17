---
title: BuilderNodes Specification - Part 02
status: draft
version: 1.0
tags:
  - workflow-engine
  - builder-nodes
  - prompt-binding
related:
  - "[[06-workflow-engine/README]]"
  - "[[BuilderNodes-Part01]]"
  - "[[NodeArchitecture-Part02]]"
  - "[[ExecutionEngine-Part01]]"
---

# BuilderNodes Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the Builder Contract, and the Artifact Boundary
Part 02 - Prompt Binding, Context Assembly, and the Worker Invocation
Part 03 - Artifact Emission, the Artifact Reference, and Output Ports
Part 04 - The "MUST NOT Write The Project" Rule and Its Enforcement
Part 05 - Retries, Timeouts, Partial Artifacts, and Failure Modes
Part 06 - Validation, the Implementation Checklist, and Worked Examples
Diagrams - BuilderNodes-Diagrams.md

# Purpose

Part 02 defines how a Builder turns its inputs and config into a Worker task: prompt binding, context assembly, and the invocation handed to the ExecutionEngine.

# Prompt Binding

A Builder's config carries a `promptTemplate`: a template string with named slots. The slots are filled from the node's resolved input ports and from a small, fixed set of run metadata (run id, iteration index, determinism seed). The binding is a pure text-substitution; it performs no logic and makes no external calls. The result is the Worker's task text.

The template MUST reference only declared inputs. A template that reaches for a global or a memory value directly is a validation error, because it would make the Builder's output depend on something outside its ports and break determinism. If context from memory is needed, it must arrive on a declared `context` input port fed by a [[NodeTypes-Part04]] Memory node.

# Context Assembly

The Builder assembles the Worker's context package from:

- the bound prompt (required);
- the `context` input port, if present (optional json);
- the `artifactKind` from config, which tells the Worker what shape of output to produce;
- the iteration index, when the Builder is inside a [[LoopNodes-Part01]] body.

The context package is serializable. It becomes part of the `ExecutionRequest` the engine sends to the [[ExecutionEngine-Part01]]. The Worker never sees the graph, only this package.

# The Worker Invocation

The Builder handler:

1. Resolves the input ports (per [[NodeArchitecture-Part02]]).
2. Binds the prompt and assembles the context package.
3. Builds an `ExecutionRequest` naming the Worker adapter, the context package, and the read-only permission profile.
4. Hands the request to the ExecutionEngine and awaits the `NodeResult`.
5. On success, extracts the emitted Artifact from the result (Part 03).

The Builder does not supervise the Worker, does not stream its terminals, and does not interpret its output beyond extracting the Artifact. Supervision, streaming, and permission are the ExecutionEngine's job.

# Determinism Note

If the prompt needs a non-deterministic element (rare), it is derived from `hash(determinismSeed + nodeId + iterationIndex)`, never from a raw random source or the clock. This keeps two runs of the same graph producing the same Builder task, which keeps replay honest.

# Invariants

```text
Prompt slots bind only to declared inputs and fixed run metadata.
Context arrives on a declared port, never by direct memory read.
The context package is serializable and graph-free.
The Builder delegates all supervision to the ExecutionEngine.
Any randomness derives from the determinism seed.
```

# AI Notes

Do not let a Builder read memory directly inside its template. If it needs memory context, route a Memory node's output into the Builder's `context` port. Direct reads bypass the memory permission and redaction model and break determinism.

Do not embed graph structure in the prompt. The Worker should not know the graph; it should know its task. Graph awareness belongs to Orchestrators, not Builders.

Do not make prompt binding do computation. Binding is substitution. Any logic in the prompt (conditions, loops) belongs in the graph as nodes, not smuggled into a template.

# Related Documents

- [[06-workflow-engine/README]]
- [[BuilderNodes-Part01]]
- [[BuilderNodes-Part03]]
- [[BuilderNodes-Diagrams]]
- [[NodeArchitecture-Part02]]
- [[ExecutionEngine-Part01]]
- [[LoopNodes-Part01]]
- [[NodeTypes-Part04]]
- [[WorkflowEngine-Part01]]
