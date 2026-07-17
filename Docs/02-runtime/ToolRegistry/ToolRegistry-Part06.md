---
title: Tool Registry Part 06 - Database, UI, Tests
status: draft
version: 1.0
tags:
  - runtime
  - tool-registry
  - database
related:
  - "[[ToolRegistry-Part01]]"
  - "[[DatabaseArchitecture]]"
---

# Tool Registry Part 06 - Database, UI, Tests

## Tables

```text
tools
tool_versions
tool_invocations
tool_permissions
tool_errors
```

## UI

Eulinx should show:

- installed tools
- enabled/disabled state
- required permissions
- recent invocations
- error history
- per-Worker allowed tools

## Tests

```text
[ ] unknown tool denied
[ ] invalid input rejected
[ ] permission checked before invoke
[ ] timeout cancels tool
[ ] output schema validated
[ ] MCP tool registration works
```

## Implementation Checklist

```text
[ ] ToolDefinition type
[ ] ToolInvocation type
[ ] registry store
[ ] adapter interface
[ ] schema validation
[ ] permission integration
[ ] event emission
[ ] UI list
```

