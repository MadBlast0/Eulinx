---
title: MCPNodes Specification - Part 06
status: draft
version: 1.0
tags:
  - workflow-engine
  - mcp-nodes
  - examples
  - checklist
related:
  - "[[06-workflow-engine/README]]"
  - [[MCPNodes-Part01]]
  - [[MCPNodes-Part05]]
  - [[WorkflowExamples-Part01]]
---

# MCPNodes Specification ( Part 06 )

## Document Index

Part 01 - Purpose, philosophy, definition, object model, states, invariants
Part 02 - Server discovery, connection lifecycle, stdio and HTTP transports
Part 03 - Tool listing, schema import, the JSON Schema to Eulinx port mapping algorithm
Part 04 - Invocation, result mapping, secrets, sandboxing, failure and retry
Part 05 - The untrusted-server rule, capability negotiation, reconnection, checklist
Part 06 - Worked examples, common mistakes, and the future expansion surface
Diagrams - MCPNodes-Diagrams.md

# Purpose

Part 06 gives two worked MCP node examples, a list of common mistakes, and the future-expansion surface for MCP integration.

# Worked Example 1 — Research Via An External Search Server

Graph: `Input(query) -> MCP(research-server / web_search) -> Verifier -> Output`.

- The MCP node's `serverId` points at a stdio-launched search server; `toolName` is `web_search`.
- At validation, the server is discovered and its `web_search` schema imported: input `query` (text), output `results` (json). Ports are mapped: input `query` <- `Input.query`; output `results` -> node `results`.
- At run, the adapter connects, invokes `web_search` with the resolved query, maps the JSON `results` onto the output port. The Verifier then checks the results; the Output publishes.
- If the server is unreachable, `server_unreachable` retries up to `maxAttempts`; if the tool vanished, `tool_not_found` fails the node.

# Worked Example 2 — A Server That Changed Under Us

Graph validated against `server v1` exposing `translate(text)->text`. At run, the server upgraded to `translate(text, tone)->text` (added a required argument). Capability negotiation (Part 05) detects the incompatible change, fails the node with `schema_mismatch`, and the run fails closed. No partial invocation occurs; no fake data enters the graph.

# Common Mistakes

- Trusting a server schema because it was valid at authoring time; always re-validate at connect.
- Storing MCP secrets in node config; use the permission system by reference.
- Retrying `tool_not_found`/`schema_mismatch`; these are contract breaks, not transient.
- Letting a non-idempotent tool use `failover-retry`; double-fires side effects.
- Allowing a server result to mint an `artifact-ref`; only Eulinx nodes mint those.

# Future Expansion Surface

The MCP node is designed to grow without changing the engine: new transports (WebSocket, gRPC) are new adapter implementations behind the same `ExecutionRequest`; new capability features (resources, prompts) map onto new port kinds via the Part 03 mapping; streaming server output maps onto the ExecutionEngine's streaming path like any other node. None of these require the WorkflowEngine to know what an MCP server is.

# Invariants

```text
The engine never knows what an MCP server is; only the adapter does.
Re-validation at connect protects against server drift.
Secrets are by reference; retries are limited to transient errors.
Only Eulinx nodes mint artifact or worker references.
New transports and capabilities extend the adapter, not the engine.
```

# AI Notes

Do not teach the WorkflowEngine about MCP. The engine dispatches a node by kind; the MCP adapter is just another ExecutionEngine adapter. Coupling the engine to MCP specifics breaks the uniform-dispatch principle in [[NodeArchitecture-Part06]].

Do not let a server upgrade silently change graph behavior. Re-validation turns a silent drift into a clean, fail-closed error that the author can fix deliberately.

Do not expand the MCP node's contract to cover server internals. Keep it "invoke tool, map result, persist". Server complexity lives in the adapter, where it is supervised and replayable.

# Related Documents

- [[06-workflow-engine/README]]
- [[MCPNodes-Part01]]
- [[MCPNodes-Part05]]
- [[MCPNodes-Diagrams]]
- [[ExecutionEngine-Part01]]
- [[NodeArchitecture-Part06]]
- [[PermissionManager-Part01]]
- [[WorkflowExamples-Part01]]
