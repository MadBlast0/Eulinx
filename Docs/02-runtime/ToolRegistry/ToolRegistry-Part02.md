---
title: Tool Registry Part 02 - Registration and Metadata
status: draft
version: 1.0
tags:
  - runtime
  - tool-registry
related:
  - "[[Tool-Part01]]"
  - "[[PluginArchitecture]]"
---

# Tool Registry Part 02 - Registration and Metadata

## Tool Definition

```text
ToolDefinition
  id
  name
  description
  provider
  version
  inputSchema
  outputSchema
  requiredPermissions
  riskLevel
  timeout
  retryPolicy
  enabled
```

## Registration Sources

```text
internal_runtime
mcp_server
plugin
cli_adapter
workflow_node
user_script
```

## Validation

ToolRegistry MUST validate tool definitions before exposing them.

Invalid tools MUST be disabled and logged.

## AI Notes

Tool metadata is not decoration. It drives permission, UI, validation, and safe invocation.

