---
title: MCPNodes Specification - Part 04
status: draft
version: 1.0
tags:
  - workflow-engine
  - mcp-nodes
  - invocation
  - failure
related:
  - "[[06-workflow-engine/README]]"
  - [[MCPNodes-Part01]]
  - [[MCPNodes-Part03]]
  - [[ExecutionEngine-Part01]]
---

# MCPNodes Specification (Part 04)

## Document Index

Part 01 - Purpose, philosophy, definition, object model, states, invariants
Part 02 - Server discovery, connection lifecycle, stdio and HTTP transports
Part 03 - Tool listing, schema import, the JSON Schema to Eulinx port mapping algorithm
Part 04 - Invocation, result mapping, secrets, sandboxing, failure and retry
Part 05 - The untrusted-server rule, capability negotiation, reconnection, checklist
Part 06 - Worked examples, common mistakes, and the future expansion surface
Diagrams - MCPNodes-Diagrams.md

# Purpose

Part 04 defines what happens when a Eulinx run actually invokes an MCP-backed tool: how the request is built, how the result maps back onto output ports, how secrets are handled, and how failures and retries behave.

An MCP node is the one node kind whose behavior Eulinx does not fully control; it lives in an external server. That makes invocation the riskiest moment, and it is why the node is wrapped in the same isolation, permission, and replay contracts as every other kind ([[NodeArchitecture-Part04]]). The execution still goes through the [[ExecutionEngine-Part01]]; the MCP adapter there is what speaks the protocol.

# Invocation

When an MCP node becomes `ready`, the engine:

1. Resolves the node's input ports to values ([[NodeArchitecture-Part02]]).
2. Maps those values onto the tool's JSON arguments per the schema mapping computed at connection time (Part 03).
3. Builds an `ExecutionRequest` naming the MCP adapter, the `serverId`, the `toolName`, the arguments, and the connection policy.
4. Hands the request to the ExecutionEngine, which opens (or reuses) the server connection and invokes the tool.
5. Awaits the tool result and the adapter's mapping of it back onto output ports.

The MCP node never speaks the protocol itself; it declares intent, and the adapter performs the I/O under supervision.

# Result Mapping

The server returns a JSON result. The adapter maps it onto the node's output ports using the inverse of the schema mapping from Part 03:

- A declared output port receives the field of the same name (or the mapped name).
- Extra result fields not mapped to a port are dropped or collected into a `raw` output port if the node declares one.
- A result whose shape violates the port types fails the node with `schema_mismatch` (fatal), because the contract the graph relied on is broken.

# Secrets and Sandboxing

An MCP server may require secrets (API keys, tokens). Those are supplied by the [[PermissionManager-Part01]] via a secret reference, never embedded in the node config or the RunContext in cleartext. The adapter receives the secret at invocation time under the connection policy. The server runs in whatever sandbox the transport provides; Eulinx treats the server as untrusted code and never grants it project-write unless an explicit, reviewed permission decision allows a specific, scoped operation.

# Failure and Retry

From the shared taxonomy ([[NodeTypes-Part05]]):

- `server_unreachable` — retryable. The server is down or the connection dropped. Retried up to `maxAttempts` (default 2 for MCP).
- `tool_not_found` — fatal. The server no longer exposes the tool; the contract broke.
- `schema_mismatch` — fatal. The result shape does not match the mapped ports.
- `tool_error` — retryable up to policy. A transient error reported by the server.
- `permission_denied` — fatal. The secret or permission was withheld.

# Invariants

```text
Invocation goes through the ExecutionEngine MCP adapter, never direct I/O.
Result fields map onto declared output ports by the Part 03 mapping.
Secrets are supplied by reference at invocation, never stored in cleartext.
An untrusted server never gets project-write without explicit permission.
server_unreachable and tool_error are retryable; others are fatal.
A schema_mismatch fails the node; the graph's contract is broken.
```

# AI Notes

Do not let the MCP node speak the protocol directly. The adapter is the supervised, permission-checked boundary. A node that opens its own socket bypasses all of that and breaks replay and isolation.

Do not store MCP secrets in the node config. Config is persisted and may be exported; secrets must come from the permission system by reference at run time.

Do not retry `tool_not_found` or `schema_mismatch`. Those are contract breaks, not transient errors. Retrying them wastes time and obscures the real fault: the server changed.

# Related Documents

- [[06-workflow-engine/README]]
- [[MCPNodes-Part01]]
- [[MCPNodes-Part03]]
- [[MCPNodes-Part05]]
- [[MCPNodes-Diagrams]]
- [[ExecutionEngine-Part01]]
- [[PermissionManager-Part01]]
- [[NodeArchitecture-Part04]]
- [[NodeTypes-Part05]]
