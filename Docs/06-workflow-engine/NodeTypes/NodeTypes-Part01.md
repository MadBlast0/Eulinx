---
title: NodeTypes Specification - Part 01
status: draft
version: 1.0
tags:
  - workflow-engine
  - node-types
  - catalog
related:
  - "[[06-workflow-engine/README]]"
  - "[[NodeArchitecture-Part01]]"
  - "[[NodeArchitecture-Part06]]"
  - "[[NodeTypes-Diagrams]]"
---

# NodeTypes Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, the Catalog Contract, and the Built-In Kind List
Part 02 - Worker, Orchestrator, Tool, and Builder Nodes
Part 03 - Verifier, Condition, Loop, and Merge Nodes
Part 04 - Artifact, Memory, MCP, and Input/Output Nodes
Part 05 - Delay and Human-Approval Nodes, and Named Failure Modes
Part 06 - Port Conventions, Config Defaults, and the Kind Selection Checklist
Diagrams - NodeTypes-Diagrams.md

# Purpose

NodeTypes is the catalog of every built-in node kind Eulinx ships.

[[NodeArchitecture-Part01]] defines the contract every node obeys. This document lists the concrete kinds that implement that contract, and for each kind states: its ports, its config shape, its behavior, and the failure modes it may produce. Think of NodeArchitecture as the interface and NodeTypes as the implementations.

The catalog is the vocabulary a workflow author uses. When the [[WorkflowEngine-Part01]] validates a graph, it checks every node's `nodeKind` against this catalog (or against a registered plugin kind). When the ExecutionEngine runs a node, it selects the adapter named by the kind's handler. So this document is the bridge between authoring and execution.

# The Built-In Kind List

The complete built-in catalog is:

- `Worker` — runs a configured AI Worker on a task.
- `Orchestrator` — plans or replans; may propose graph mutations (see [[DynamicGraphs-Part01]]).
- `Tool` — invokes a tool registered in the [[ToolRegistry-Part01]].
- `Builder` — produces an Artifact through an AI Worker (see [[BuilderNodes-Part01]]).
- `Verifier` — checks an Artifact and returns a Verdict (see [[VerifierNodes-Part01]]).
- `Condition` — branches on an expression (see [[ConditionNodes-Part01]]).
- `Loop` — iterates a body subgraph (see [[LoopNodes-Part01]]).
- `Merge` — joins branches with explicit join semantics.
- `Artifact` — reads or writes an Artifact reference.
- `Memory` — reads from or writes to Eulinx memory (see [[04-memory/README]]).
- `MCP` — backed by an external MCP server (see [[MCPNodes-Part01]]).
- `Input` — an entry point that seeds the RunContext from the run trigger.
- `Output` — a terminal node that publishes a result.
- `Delay` — waits a deterministic interval.
- `Human-approval` — pauses the run for a human decision.

# The Catalog Contract

For every kind, this catalog records:

- `kind`: the registry string.
- `inputs`: the declared input ports (name, type, required).
- `outputs`: the declared output ports.
- `config`: the config fields and their meaning.
- `behavior`: what the handler does when run.
- `failures`: the named failure modes the kind may produce, each mapped to retryable or fatal.

The handler field is implicit: it is the adapter the ExecutionEngine selects. This document does not specify adapter internals; it specifies the node's observable contract.

# Invariants

```text
Every built-in kind is registered at engine startup.
Every kind's ports and config are schema-validated before run.
A kind never reads global state beyond declared inputs.
A kind never writes trusted project state directly.
A kind's named failures are classified retryable or fatal.
The catalog is fixed for the life of a run snapshot.
```

# AI Notes

Do not add behavior to a kind by special-casing it in the engine. If a kind needs new behavior, extend its handler adapter and its schema; keep the engine's dispatch uniform. Special cases in the engine are where determinism leaks.

Do not let an author assume two kinds with similar names behave similarly. A `Builder` and a `Worker` differ precisely in that a Builder emits an Artifact and MUST NOT write the project, while a Worker may be granted project writes under permission. Read each kind's contract.

Do not treat the catalog as closed. Plugins add kinds through [[NodeArchitecture-Part06]]. The built-in list here is the baseline, not the ceiling.

# Related Documents

- [[06-workflow-engine/README]]
- [[NodeTypes-Part02]]
- [[NodeTypes-Part03]]
- [[NodeTypes-Diagrams]]
- [[NodeArchitecture-Part01]]
- [[NodeArchitecture-Part06]]
- [[WorkflowEngine-Part01]]
- [[ToolRegistry-Part01]]
