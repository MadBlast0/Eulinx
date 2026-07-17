---
title: MCPNodes Diagrams
status: draft
version: 1.0
tags:
  - workflow-engine
  - mcp-nodes
  - diagrams
related:
  - "[[06-workflow-engine/README]]"
  - "[[MCPNodes-Part01]]"
  - "[[MCPNodes-Part04]]
---

# MCPNodes Diagrams

## Server Lifecycle and Invocation

```mermaid
flowchart TD
  DISC["discover servers"] --> CONN["connect (stdio / http)"]
  CONN --> CAP["capability negotiation (schema re-validation)"]
  CAP --> INV["invoke tool via ExecutionEngine adapter"]
  INV --> MAP["map result onto output ports"]
  MAP --> OUT["emit outputs"]
  CAP -->|"schema changed"| REJ["reject: schema_mismatch / tool_not_found"]
```

## Untrusted Boundary

```text
MCP Node (declares intent)
   |
   v
ExecutionEngine MCP Adapter (supervised, permission-checked)
   |
   v
External MCP Server (untrusted code, elsewhere)
   |
   v
Result mapped to ports; server CANNOT forge artifact-ref / worker-handle
```

## ASCII: Secret Handling

```text
node config: serverId, toolName        (no secrets in cleartext)
permission system: secret by reference
adapter at invoke: receives secret     (never persisted in RunContext)
```

## Related Documents

- [[06-workflow-engine/README]]
- [[MCPNodes-Part01]]
- [[MCPNodes-Part03]]
- [[MCPNodes-Part04]]
- [[MCPNodes-Part05]]
- [[ExecutionEngine-Part01]]
- [[PermissionManager-Part01]]
