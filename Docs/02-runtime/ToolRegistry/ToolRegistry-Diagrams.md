---
title: ToolRegistry Diagrams
status: draft
version: 1.0
tags:
  - runtime
  - tool-registry
  - tools
  - diagrams
related:
  - "[[02-runtime/README]]"
  - "[[ToolRegistry-Part01]]"
  - "[[Tool-Part01]]"
  - "[[PermissionManager-Part01]]"
  - "[[EventBus-Part01]]"
---

# ToolRegistry Diagrams

## Tool Registration

### High-Level Overview

```mermaid
graph LR
  SRC["Source: internal, MCP, plugin, CLI, workflow node, user script"] --> TR["ToolRegistry"]
  TR --> VAL["Validate definition"]
  VAL --> OK["Registered and enabled"]
  VAL --> BAD["Disabled and logged"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  SRC["Registration source"] --> DEF["ToolDefinition"]
  DEF --> V1{"Schemas present and valid?"}
  V1 -->|"No"| DIS["Disable tool"]
  V1 -->|"Yes"| V2{"requiredPermissions declared?"}
  V2 -->|"No"| PLG{"Plugin or MCP source?"}
  PLG -->|"Yes"| DIS
  PLG -->|"No"| V3
  V2 -->|"Yes"| V3{"riskLevel declared?"}
  V3 -->|"No"| DIS
  V3 -->|"Yes"| SCOPE["Scope MCP server per workspace or project"]
  SCOPE --> REG["Store in tools and tool_versions"]
  REG --> ENA["tool.registered"]
  DIS --> EDIS["tool.disabled with reason"]
  ENA -.-> EB["EventBus"]
  EDIS -.-> EB
```

### ASCII

```text
ToolDefinition
  id | name | description | provider | version
  inputSchema | outputSchema | requiredPermissions
  riskLevel | timeout | retryPolicy | enabled

Registration sources:
  internal_runtime | mcp_server | plugin | cli_adapter
  workflow_node | user_script

Rules:
  Definitions MUST be validated before exposure.
  Invalid tools MUST be disabled and logged.
  Plugin tools MUST be disabled by default if permissions are unknown.
  MCP tools MUST declare schemas and permission requirements.
  CLI tools are high risk: strict permission and preview required.

A formatter and an SSH command are not the same kind of capability.
```

### Sequence

```mermaid
sequenceDiagram
  participant MCP as "MCP Server"
  participant TR as "ToolRegistry"
  participant DB as "tools table"
  participant EB as "EventBus"
  participant UI as "Eulinx UI"

  MCP->>TR: advertise tool definitions
  TR->>TR: validate inputSchema and outputSchema
  TR->>TR: check requiredPermissions and riskLevel
  TR->>DB: insert tool and tool_version, scoped to workspace
  TR->>EB: tool.registered
  EB-->>UI: show installed tool, required permissions
  MCP->>TR: advertise tool with unknown permissions
  TR->>DB: store disabled
  TR->>EB: tool.disabled
```

## Invocation Pipeline

### High-Level Overview

```mermaid
graph LR
  W["Worker or Workflow Node"] --> TR["ToolRegistry"]
  TR --> PM["PermissionManager"]
  TR --> V["Schema Validator"]
  TR --> AD["Registered Tool Adapter"]
  AD --> RES["Result Artifact or Event"]
  TR -.-> EB["EventBus"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  INV["Receive invocation"] --> EX{"Tool exists and enabled?"}
  EX -->|"No"| FC["Fail closed: unknown tool"]
  EX -->|"Yes"| IS{"Input matches inputSchema?"}
  IS -->|"No"| VE["validation_error"]
  IS -->|"Yes"| PERM["PermissionManager.evaluate"]
  PERM -->|"deny"| PD["permission_denied, tool.permission_denied"]
  PERM -->|"require_approval"| WAIT["Wait for user approval"]
  WAIT --> PERM
  PERM -->|"allow"| LIM{"Rate and concurrency limits ok?"}
  LIM -->|"No"| QUE["Queue or reject"]
  LIM -->|"Yes"| ADP["Invoke adapter, tool.started"]
  ADP --> TMO{"Exceeded timeout?"}
  TMO -->|"Yes"| TO["timeout, cancel tool"]
  TMO -->|"No"| OS{"Output matches outputSchema?"}
  OS -->|"No"| VE
  OS -->|"Yes"| ART["Store output if artifact-worthy"]
  ART --> OKE["tool.succeeded"]
  OKE --> RET["Return result"]
  OKE -.-> EB["EventBus"]
  PD -.-> EB
  TO -.-> EB
  VE -.-> EB
```

### ASCII

```text
Pipeline:
  receive invocation
  validate tool exists
  validate input schema
  check permission
  check rate/concurrency limits
  invoke adapter
  validate output schema
  store output if artifact-worthy
  emit event
  return result

InvocationRequest:
  toolId | actorId | workspaceId | projectId | sessionId
  input | reason | timeout

Result types:
  success | failure | permission_denied | validation_error
  timeout | cancelled | partial

Always validate model-produced tool arguments.
The model is not the schema authority.
Tool output is untrusted: it becomes an Artifact, not trusted state.
```

### Sequence

```mermaid
sequenceDiagram
  participant W as "Worker"
  participant TR as "ToolRegistry"
  participant PM as "PermissionManager"
  participant AD as "Tool Adapter"
  participant AM as "ArtifactManager"
  participant EB as "EventBus"

  W->>TR: invoke(toolId filesystem.write, input)
  TR->>EB: tool.invocation_requested
  TR->>TR: tool exists and enabled
  TR->>TR: validate input against inputSchema
  TR->>PM: evaluate(requiredPermissions, riskLevel)
  PM-->>TR: allow
  TR->>AD: invoke with timeout
  TR->>EB: tool.started
  AD-->>TR: output payload
  TR->>TR: validate output against outputSchema
  TR->>AM: store artifact-worthy output
  TR->>EB: tool.succeeded
  TR-->>W: success result
```

## Failure and Security Handling

### High-Level Overview

```text
Unknown tool  -> fail closed
Bad input     -> validation_error, never reaches adapter
Denied        -> permission_denied, adapter never runs
Slow          -> timeout cancels the tool
Error         -> sanitize before it enters model context
```

### Detailed Mermaid

```mermaid
flowchart TD
  FAIL["Tool invocation problem"] --> KIND{"Failure kind"}
  KIND -->|"unknown tool"| FC["Fail closed"]
  KIND -->|"invalid input"| VE["validation_error"]
  KIND -->|"denied"| PD["permission_denied"]
  KIND -->|"timeout"| TO["tool.timeout, cancel adapter"]
  KIND -->|"adapter error"| ER["tool.failed"]
  FC --> STR["Build structured error"]
  VE --> STR
  PD --> STR
  TO --> STR
  ER --> STR
  STR --> F1["code"]
  STR --> F2["message"]
  STR --> F3["retryable"]
  STR --> F4["safeForModel"]
  STR --> F5["safeForUser"]
  STR --> F6["details"]
  F4 --> SAN{"safeForModel true?"}
  SAN -->|"Yes"| MOD["Sanitized error into Worker context"]
  SAN -->|"No"| HIDE["Withhold from model, log internally"]
  STR --> REC["Record in tool_errors"]
  REC -.-> EB["EventBus"]
  RET{"retryable and retryPolicy allows?"} -->|"Yes"| AGAIN["Retry invocation"]
  STR --> RET
  RET -->|"No"| DONE["Return failure"]
```

### ASCII

```text
Events:
  tool.registered | tool.disabled | tool.invocation_requested
  tool.permission_denied | tool.started | tool.succeeded
  tool.failed | tool.timeout

Security rules, ToolRegistry MUST:
  validate inputs | check permissions | enforce timeouts
  record invocations | isolate plugin tools
  hide secrets from logs | fail closed on unknown tools

Structured error:
  code | message | retryable | safeForModel | safeForUser | details

Never return raw secret-bearing errors to a Worker.
Sanitize tool errors before putting them into model context.

Tables: tools, tool_versions, tool_invocations, tool_permissions, tool_errors
```

### Sequence

```mermaid
sequenceDiagram
  participant W as "Worker"
  participant TR as "ToolRegistry"
  participant PM as "PermissionManager"
  participant AD as "Tool Adapter"
  participant EB as "EventBus"

  W->>TR: invoke(toolId git.push)
  TR->>PM: evaluate(riskLevel critical)
  PM-->>TR: deny, project hard deny on push
  TR->>EB: tool.permission_denied
  TR-->>W: permission_denied, sanitized reason
  W->>TR: invoke(toolId cli.run, long command)
  TR->>AD: invoke with timeout
  AD--)TR: no response before timeout
  TR->>AD: cancel
  TR->>EB: tool.timeout
  TR-->>W: timeout error, safeForModel true, retryable true
```

## Related Documents

- [[ToolRegistry-Part01]]
- [[ToolRegistry-Part02]]
- [[ToolRegistry-Part03]]
- [[ToolRegistry-Part04]]
- [[ToolRegistry-Part05]]
- [[ToolRegistry-Part06]]
- [[Tool-Part01]]
- [[PermissionManager-Part01]]
- [[ArtifactManager-Part01]]
- [[EventBus-Part01]]
- [[02-runtime/README]]
