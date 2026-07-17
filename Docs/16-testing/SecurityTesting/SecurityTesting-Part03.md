---
title: SecurityTesting Specification - Part 03
status: draft
version: 1.0
tags:
  - testing
  - security-testing
  - plugin
related:
  - "[[SecurityTesting-Part02]]"
  - "[[SecurityTesting-Part04]]"
---

# SecurityTesting Specification (Part 03)

## Document Index

Part 01 - Threat Model and Refusal-First Policy
Part 02 - Sandbox and Permission Testing
Part 03 - Plugin Boundary Testing
Part 04 - Secrets, Redaction, and Adversarial Input

# Plugin Boundary Testing

The plugin system (per [[09-plugin-system/README]]) MUST be tested as a hostile boundary because third-party plugins are untrusted code.

Cases to cover:

- a plugin can only register via the declared SDK hooks; direct host API access is refused,
- a plugin cannot read another plugin's state,
- a plugin cannot access the user's keys or secure store,
- a plugin cannot subscribe to events outside its declared scope,
- a plugin that throws does not crash the host,
- a plugin node added to the canvas cannot execute outside the permission set of its owning Worker,
- plugin enable/disable and load/unload leave no dangling native handles.

# MCP Surface Testing

MCP servers (per ChatHistory) are user-added capabilities. Tests MUST assert:

- a disabled MCP exposes no tools to any Worker,
- an enabled MCP's tools are scoped to Workers granted `MCP Access`,
- a malicious MCP tool description cannot escalate beyond its granted scope.

# Related Documents

- [[09-plugin-system/PluginArchitecture-Part01]]
- [[09-plugin-system/HookSystem-Part01]]
