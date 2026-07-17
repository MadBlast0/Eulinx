---
title: NodeTypes Specification - Part 04
status: draft
version: 1.0
tags:
  - workflow-engine
  - node-types
  - io
  - mcp
related:
  - "[[06-workflow-engine/README]]"
  - "[[NodeTypes-Part01]]"
  - "[[MCPNodes-Part01]]"
  - "[[Artifact-Part01]]"
---

# NodeTypes Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, the Catalog Contract, and the Built-In Kind List
Part 02 - Worker, Orchestrator, Tool, and Builder Nodes
Part 03 - Verifier, Condition, Loop, and Merge Nodes
Part 04 - Artifact, Memory, MCP, and Input/Output Nodes
Part 05 - Delay and Human-Approval Nodes, and Named Failure Modes
Part 06 - Port Conventions, Config Defaults, and the Kind Selection Checklist
Diagrams - NodeTypes-Diagrams.md

# Purpose

Part 04 specifies four more built-in kinds: `Artifact`, `Memory`, `MCP`, and the pair `Input` / `Output`.

These kinds are the graph's interfaces with the outside world: with the artifact store, with Eulinx memory, with external MCP servers, and with the run trigger and the run result.

# Artifact Node

The `Artifact` node reads or writes an Artifact reference (see [[Artifact-Part01]]).

- Inputs: `artifactRef` (artifact-ref, for read) or `content` (any, for write).
- Outputs: `content` (any, for read) or `artifactRef` (artifact-ref, for write).
- Config: `mode` (read | write), `artifactKind`, `storeId`.
- Behavior: in write mode, captures `content` into the artifact store and emits a reference; in read mode, resolves a reference and emits its content.
- Failures: `artifact_missing` (fatal), `store_unavailable` (retryable).

An Artifact node stores into the artifact store, not into trusted project state. Application is the [[MergeManager-Part01]]'s job.

# Memory Node

The `Memory` node reads from or writes to Eulinx memory (see [[04-memory/README]]).

- Inputs: `query` (text/json, for read) or `entry` (json, for write).
- Outputs: `results` (json, for read) or `memoryRef` (text, for write).
- Config: `scope` (workspace | worker | task), `permissionTags`, `redact` (boolean).
- Behavior: routes to the [[MemoryManager-Part01]] under the configured scope and permission tags; respects redaction rules.
- Failures: `memory_unavailable` (retryable), `permission_denied` (fatal), `secret_exposure` (fatal).

Memory nodes MUST NOT expose secrets by default, per the [[04-memory/README]] core principles.

# MCP Node

The `MCP` node is backed by an external Model Context Protocol server. Full detail in [[MCPNodes-Part01]].

- Inputs: derived from the server's discovered tool schema, mapped onto typed ports (see [[MCPNodes-Part03]]).
- Outputs: derived from the tool's result schema.
- Config: `serverId`, `toolName`, `connectionPolicy`, `timeoutMs`.
- Behavior: connects to the server, invokes the tool, maps the result back onto output ports.
- Failures: `server_unreachable` (retryable), `tool_not_found` (fatal), `schema_mismatch` (fatal).

# Input and Output Nodes

The `Input` node is an entry point. It seeds the RunContext from the run trigger and has no required inputs. Its outputs are the run's initial values. The `Output` node is terminal. It publishes a result and has no required outputs; it marks the run's result field. Both are simple but essential: every graph has at least one `Input` and usually one `Output`.

- Input node failures: `trigger_invalid` (fatal).
- Output node failures: `missing_result` (fatal when a required output port is unsatisfied).

# AI Notes

Do not let an Artifact node write straight into the project. Writing to the artifact store keeps the apply-step centralized in the MergeManager, which is where verification and permission live.

Do not let a Memory node bypass redaction. A Memory node configured to expose secrets defeats the memory security model and is a fatal configuration error.

Do not assume an MCP server is always reachable. Treat `server_unreachable` as the normal case and design the retry policy accordingly; treat `schema_mismatch` as a contract break that must fail closed.

# Related Documents

- [[06-workflow-engine/README]]
- [[NodeTypes-Part01]]
- [[NodeTypes-Part03]]
- [[NodeTypes-Diagrams]]
- [[MCPNodes-Part01]]
- [[Artifact-Part01]]
- [[MemoryManager-Part01]]
- [[04-memory/README]]
- [[MergeManager-Part01]]
