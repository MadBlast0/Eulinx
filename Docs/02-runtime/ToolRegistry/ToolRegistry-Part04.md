---
title: Tool Registry Part 04 - MCP, Plugins, CLI, Internal Tools
status: draft
version: 1.0
tags:
  - runtime
  - tool-registry
  - mcp
related:
  - "[[MCPIntegration]]"
  - "[[PluginArchitecture]]"
---

# Tool Registry Part 04 - MCP, Plugins, CLI, Internal Tools

## Tool Families

```text
Internal tools - built into Eulinx runtime
MCP tools - exposed by MCP servers
Plugin tools - installed extensions
CLI tools - command adapters
Workflow tools - node-level callable actions
```

## MCP Rules

MCP tools MUST be registered with declared schemas and permission requirements.

MCP servers SHOULD be scoped per workspace or project where possible.

## Plugin Rules

Plugin tools MUST be disabled by default if their permissions are unknown.

## CLI Rules

CLI tools are high risk because they may execute broad commands. They require strict permission and preview.

## AI Notes

Do not treat all tools as equal risk. A formatter and an SSH command are not the same kind of capability.

