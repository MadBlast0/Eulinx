---
title: MCPNodes Specification - Part 05
status: draft
version: 1.0
tags:
  - workflow-engine
  - mcp-nodes
  - trust
  - negotiation
related:
  - "[[06-workflow-engine/README]]"
  - [[MCPNodes-Part01]]
  - [[MCPNodes-Part04]]
  - [[DynamicGraphs-Part01]]
---

# MCPNodes Specification ( Part 05 )

## Document Index

Part 01 - Purpose, philosophy, definition, object model, states, invariants
Part 02 - Server discovery, connection lifecycle, stdio and HTTP transports
Part 03 - Tool listing, schema import, the JSON Schema to Eulinx port mapping algorithm
Part 04 - Invocation, result mapping, secrets, sandboxing, failure and retry
Part 05 - The untrusted-server rule, capability negotiation, reconnection, checklist
Part 06 - Worked examples, common mistakes, and the future expansion surface
Diagrams - MCPNodes-Diagrams.md

# Purpose

Part 05 defines the trust posture around MCP servers: that a server is untrusted input, how capability negotiation protects the graph, and how reconnection and validation keep runs safe.

The whole workflow engine treats AI-proposed and external input as untrusted (README global principle). An MCP server is the strongest form of that: it is code Eulinx did not write, running elsewhere, that can return arbitrary data and claim arbitrary capabilities. The node must therefore never trust a server's self-description beyond what validation confirms.

# The Untrusted-Server Rule

An MCP server is untrusted. The node MUST:

- re-validate the server's tool schema at connection time against the schema captured at graph-validation time; if they differ, treat the run as `graph_invalid` for that node (the contract changed);
- never accept a tool result that claims side effects on trusted state unless an explicit permission decision authorized that specific operation;
- never let a server's returned data forge an `artifact-ref` or a `worker-handle`; those are produced only by Eulinx nodes ([[NodeTypes-Part01]]).

The server can influence what the node outputs, but it cannot manufacture Eulinx-native references. That boundary is what stops a compromised server from injecting a fake artifact into a verified pipeline.

# Capability Negotiation

At connection, the adapter performs a capability handshake: it lists the server's tools and their schemas and compares them to the graph's expected `toolName` and port mapping. If the expected tool is absent or its schema changed incompatibly, the node fails with `tool_not_found` or `schema_mismatch` (Part 04). Compatible additions (extra optional fields) are tolerated; incompatible changes (a required argument removed, a return type changed) are not. Negotiation is recorded so Replay and audit can show what the server claimed at run time.

# Reconnection

A dropped connection is handled by the adapter under the `connectionPolicy`:

- `failover-retry`: reopen the connection and re-invoke, counting toward `maxAttempts` as `server_unreachable`.
- `fail-closed`: any drop fails the node immediately; no retry.
- `stateless-resume`: for HTTP transports, a new request to the same endpoint is treated as a fresh invocation if the tool is idempotent; non-idempotent tools use `fail-closed`.

The policy is part of the node config and is validated at graph load.

# Checklist

- Is the server's schema re-validated against the captured schema at connect time?
- Are secrets supplied by reference, never persisted in cleartext?
- Does the node refuse to forge Eulinx-native references from server data?
- Is the `connectionPolicy` explicit and validated?
- Are incompatible schema changes rejected, not silently accepted?

# Invariants

```text
A server is untrusted; its schema is re-validated at connect time.
A changed schema fails the node; the contract is broken.
A server cannot forge artifact-ref or worker-handle values.
Secrets are by reference; cleartext never persists.
Reconnection follows the explicit connectionPolicy.
Incompatible schema changes are rejected, not tolerated.
```

# AI Notes

Do not trust a server's schema because "it worked last time". Servers update. Re-validate at connect; a changed required argument is a real break, not a nuisance to swallow.

Do not let a server return value masquerade as an `artifact-ref`. Only Eulinx nodes mint artifact references. Accepting a server-supplied reference lets a malicious server inject unverified artifacts into a verified pipeline.

Do not use `failover-retry` for non-idempotent tools. Re-invoking a tool that charges a credit or sends an email double-fires. Use `fail-closed` or `stateless-resume` with proof of idempotency.

# Related Documents

- [[06-workflow-engine/README]]
- [[MCPNodes-Part01]]
- [[MCPNodes-Part04]]
- [[MCPNodes-Part06]]
- [[MCPNodes-Diagrams]]
- [[DynamicGraphs-Part01]]
- [[NodeTypes-Part01]]
- [[PermissionManager-Part01]]
- [[WorkflowEngine-Part02]]
