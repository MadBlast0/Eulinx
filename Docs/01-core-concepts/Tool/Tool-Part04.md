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
  - "[Tool-Part03]"
---

# Tool Specification (Part 04)

## Permissions

Every Tool is protected by the Runtime permission system.

Workers never grant themselves permissions.

Only the Runtime may authorize Tool execution.

---

## Permission Categories

- Filesystem
- Terminal
- Network
- Browser
- Git
- Database
- MCP
- Secrets
- Environment Variables
- Process Management

Each category may contain fine-grained permissions.

---

## Permission Evaluation

Before execution, the Runtime validates:

1. Workspace policy
2. User policy
3. Worker permissions
4. Tool requirements
5. Runtime security policy

If any check fails, execution is denied.

---

## Permission Modes

Supported modes:

- Deny
- Allow Once
- Allow for Session
- Allow for Workspace
- Always Allow (YOLO Mode)

YOLO Mode should be clearly visible in the UI and may be restricted by Workspace policy.

---

## Security Rules

The Runtime MUST:

- Validate every invocation
- Log permission decisions
- Prevent privilege escalation
- Isolate Tool execution
- Audit sensitive operations

Workers MUST NOT bypass permission checks.

---

## Events

PermissionRequested
PermissionGranted
PermissionDenied
PermissionExpired
PermissionRevoked

---

## AI Notes

Permissions are enforced by the Runtime, not by prompts.

Every Tool invocation must be traceable to an explicit permission decision.

