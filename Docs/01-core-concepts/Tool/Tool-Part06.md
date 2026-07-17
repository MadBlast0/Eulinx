---
title: ToolSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - tools
related:
  - "[[01-core-concepts/README]]"
  - "[Tool-Part01]"
  - "[Tool-Part05]"
---

# Tool Specification (Part 06)

## MCP Integration

The Runtime supports the Model Context Protocol (MCP) as a standardized mechanism for exposing external capabilities.

Workers never communicate with MCP servers directly.

All communication flows through the Runtime.

---

## MCP Architecture

Worker
↓
Runtime
↓
MCP Manager
↓
Registered MCP Server
↓
Tool Execution
↓
Structured Response

---

## MCP Registry

The Runtime maintains a registry containing:

- Server ID
- Name
- Version
- Endpoint
- Authentication
- Available Tools
- Health Status
- Permissions

Only healthy and authorized MCP servers may be used.

---

## Connection Lifecycle

Configured
↓
Validated
↓
Connected
↓
Tool Discovery
↓
Available
↓
Serving Requests
↓
Disconnected

---

## Discovery

When an MCP server connects, the Runtime SHOULD automatically:

- Discover available tools
- Cache metadata
- Validate compatibility
- Register capabilities
- Emit discovery events

---

## Security

The Runtime MUST:

- Authenticate MCP servers
- Enforce permission policies
- Isolate Workspace access
- Log every request
- Prevent unauthorized capability exposure

---

## Failure Handling

If an MCP server becomes unavailable:

- Mark it offline
- Stop scheduling new requests
- Preserve pending work
- Retry connection when appropriate
- Notify dependent Workers

---

## AI Notes

MCP servers extend the Runtime's capabilities without changing Worker behavior.

Workers request capabilities; the Runtime resolves them through local Tools or MCP servers.

