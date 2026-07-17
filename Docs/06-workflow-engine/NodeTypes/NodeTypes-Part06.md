---
title: NodeTypes Specification - Part 06
status: draft
version: 1.0
tags:
  - workflow-engine
  - node-types
  - conventions
related:
  - "[[06-workflow-engine/README]]"
  - "[[NodeTypes-Part01]]"
  - "[[NodeArchitecture-Part02]]"
  - "[[NodeTypes-Diagrams]]"
---

# NodeTypes Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, the Catalog Contract, and the Built-In Kind List
Part 02 - Worker, Orchestrator, Tool, and Builder Nodes
Part 03 - Verifier, Condition, Loop, and Merge Nodes
Part 04 - Artifact, Memory, MCP, and Input/Output Nodes
Part 05 - Delay and Human-Approval Nodes, and Named Failure Modes
Part 06 - Port Conventions, Config Defaults, and the Kind Selection Checklist
Diagrams - NodeTypes-Diagrams.md

# Purpose

Part 06 collects the cross-cutting conventions every kind in the catalog follows, the default config values, and a checklist for choosing the right kind when authoring a graph.

# Port Naming Conventions

To keep graphs readable and edges unambiguous, the catalog fixes these port-name conventions:

- Entry nodes name their seed outputs after the value they carry (`goal`, `spec`, `trigger`).
- Error outputs are always named `error` when present.
- Condition branch outputs are named by branch (`true`, `false`, or explicit branch names).
- Merge output is always `merged`; the chosen branch is reported on `selectedBranch`.
- A node's primary result is `result` for text, `artifactRef` for an artifact reference, `verdict` for a verification result, `decision` for an approval.

Consistent names mean an author can read a graph without opening every node's config, and the engine's generic edge-resolution code works uniformly.

# Config Defaults

Default config values applied when a field is omitted:

- `timeoutMs`: 300000 (five minutes) for Worker/Builder/Tool; 60000 for Condition/Merge; server-defined for MCP.
- `maxAttempts`: 1 for deterministic kinds (Condition, Merge, Verifier-deterministic); 3 for Worker/Builder/Tool; 2 for MCP.
- `permissionProfileId`: the workspace default for Worker; a read-only profile for Builder, Verifier, Memory-read.
- `deterministicSeed`: derived from `determinismSeed` + `nodeId` (see [[WorkflowEngine-Part01]]) for any kind needing randomness.

# Kind Selection Checklist

When authoring, choose a kind by answering:

1. Does this step produce an Artifact to be verified later? Use `Builder`.
2. Does it check an Artifact? Use `Verifier`.
3. Does it branch on data? Use `Condition`.
4. Does it repeat a subgraph? Use `Loop`.
5. Does it join parallel branches? Use `Merge`.
6. Does it need an external server's tool? Use `MCP`.
7. Does it need a human decision? Use `Human-approval`.
8. Does it read or write memory or artifacts? Use `Memory` or `Artifact`.
9. Otherwise, does a Worker or Tool do the job? Use `Worker` (with permission) or `Tool`.

# Invariants

```text
Port names follow the catalog conventions.
Omitted config fields take the documented defaults.
A kind is chosen by the checklist, not by side effects.
Deterministic kinds default to maxAttempts 1.
Permission profiles default to least privilege per kind.
```

# AI Notes

Do not invent ad-hoc port names per graph. The conventions exist so edges are self-describing and the generic resolver works. A node named `out` instead of `result` is a small tax paid by every future reader.

Do not grant a Builder or Verifier a write permission profile by default. Least privilege is the default; broadening it must be an explicit, reviewed choice.

Do not pick `Worker` when `Builder` is correct just because both run a model. The Artifact boundary is a safety property, not a stylistic choice. Use `Builder` whenever the output should be verified and merged rather than applied directly.

# Related Documents

- [[06-workflow-engine/README]]
- [[NodeTypes-Part01]]
- [[NodeTypes-Diagrams]]
- [[NodeArchitecture-Part02]]
- [[BuilderNodes-Part01]]
- [[VerifierNodes-Part01]]
- [[WorkflowEngine-Part01]]
- [[PermissionManager-Part01]]
