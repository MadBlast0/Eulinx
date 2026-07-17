---
title: MCPIntegration Diagrams
status: draft
version: 1.0
tags:
  - plugin-system
  - mcp-integration
  - diagrams
related:
  - "[[09-plugin-system/README]]"
  - [[MCPIntegration-Part01]]
  - [[MCPIntegration-Part04]]
  - [[MCPIntegration-Part05]]
---

# MCPIntegration Diagrams

## Eulinx Is An MCP Client

```text
                      Eulinx process
   +--------------------------------------------------+
   |                                                  |
   |   Worker  -->  ToolRegistry  -->  MCPAdapter     |
   |                                        |         |
   |                                   MCPClient      |
   |                                        |         |
   |                              MCPConnectionPool   |
   |                                   |    |    |    |
   +-----------------------------------|----|----|----+
                                       |    |    |
                       stdio child ----+    |    +---- HTTPS
                                            |
                                       stdio child

   Eulinx INITIATES. Eulinx sends initialize. Eulinx sends tools/call.
   The server RESPONDS.
   A server MUST NOT be able to call INTO Eulinx's tools.
   Eulinx declares NO sampling, NO roots, NO elicitation.
```

## Config Validation

```mermaid
flowchart TD
  A["mcp-servers.json"] --> B["parse JSON"]
  B -->|"fail"| Z["Reject whole file. Emit mcp.config_rejected."]
  B -->|"ok"| C["per server: id grammar + unique?"]
  C -->|"no"| Z
  C -->|"yes"| D["transport + transport-specific fields valid?"]
  D -->|"no"| Z
  D -->|"yes"| E["no inline secrets?"]
  E -->|"no"| Z
  E -->|"yes"| F["enabled?"]
  F -->|"yes"| G["queue for transport"]
  F -->|"no"| H["state = configured, idle"]
```

## Transports

```mermaid
flowchart TD
  subgraph HOST["Eulinx Host"]
    CFG["config: transport"] --> SEL{"stdio or http?"}
    SEL -->|"stdio"| SP["spawn child, scrubbed env, capped stdout"]
    SEL -->|"http"| HT["POST to https, keychain headers, capped resp"]
  end
  SP -.->|"stdin/stdout"| PROC["MCP server process (UNTRUSTED)"]
  HT -.->|"https"| REM["Remote MCP server (UNTRUSTED)"]
  style PROC stroke-dasharray: 5 5
  style REM stroke-dasharray: 5 5
```

## Handshake And Capability Negotiation

```mermaid
flowchart TD
  A["starting"] --> B["initialize (Eulinx declares min caps)"]
  B --> C["wait InitializeResult"]
  C --> D["send notifications/initialized"]
  D --> E{"capabilities?"}
  E -->|"tools"| F["tools/list"]
  E -->|"resources"| G["resources/list"]
  E -->|"prompts"| H["prompts/list"]
  F --> I["validate + hash + register"]
  G --> I
  H --> I
  B -.->|"server asks sampling"| X["-32601, flag server"]
```

## Tool Mapping And Invocation

```mermaid
flowchart TD
  A["Worker calls mcp.<id>.<tool>"] --> B["ToolRegistry -> MCP adapter"]
  B --> C["PermissionManager: server MCP grant?"]
  C -->|"deny"| D["ToolResult: permission_denied"]
  C -->|"allow"| E["tools/call, Eulinx deadline"]
  E --> F["size-cap response"]
  F --> G["map to ToolResult, redact secrets"]
  G --> H["deliver to Worker"]
```

## Failure And Quarantine

```mermaid
flowchart TD
  A["call/tools/list fails"] --> B["deregister tools, state=reconnecting"]
  B --> C["backoff retry (bounded)"]
  C -->|"success"| OK["ready"]
  C -->|"budget spent"| Q["quarantined, manual reset"]
  A2["security violation"] --> Q
  OK -.->|"call timeout"| T["ToolResult error, no retry"]
```

## Related Documents

- [[09-plugin-system/README]]
- [[MCPIntegration-Part01]]
- [[MCPIntegration-Part02]]
- [[MCPIntegration-Part03]]
- [[MCPIntegration-Part04]]
- [[MCPIntegration-Part05]]
- [[MCPIntegration-Part06]]
- [[ToolRegistry-Part01]]
- [[PermissionManager-Part01]]
