---
title: Tool Registry Part 05 - Security, Errors, Events
status: draft
version: 1.0
tags:
  - runtime
  - tool-registry
  - security
related:
  - "[[EventBus-Part01]]"
  - "[[PermissionManager-Part01]]"
---

# Tool Registry Part 05 - Security, Errors, Events

## Events

```text
tool.registered
tool.disabled
tool.invocation_requested
tool.permission_denied
tool.started
tool.succeeded
tool.failed
tool.timeout
```

## Security Rules

ToolRegistry MUST:

- validate inputs
- check permissions
- enforce timeouts
- record invocations
- isolate plugin tools
- hide secrets from logs
- fail closed on unknown tools

## Error Handling

Errors SHOULD be structured:

```text
code
message
retryable
safeForModel
safeForUser
details
```

## AI Notes

Never return raw secret-bearing errors to a Worker. Sanitize tool errors before putting them into model context.

