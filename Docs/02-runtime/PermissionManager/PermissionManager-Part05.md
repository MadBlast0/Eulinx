---
title: Permission Manager Part 05 - Audit, Failures, Security
status: draft
version: 1.0
tags:
  - runtime
  - permission-manager
  - audit
  - security
related:
  - "[[EventBus-Part01]]"
  - "[[RuntimeRules-Part01]]"
  - "[[Session-Part01]]"
---

# Permission Manager Part 05 - Audit, Failures, Security

## Purpose

This part defines how PermissionManager records decisions, handles failures, and protects Eulinx from unsafe authorization behavior.

## Audit Events

Every permission decision MUST create an audit event:

```text
permission.requested
permission.allowed
permission.denied
permission.approval_required
permission.approval_resolved
permission.grant_created
permission.grant_expired
permission.grant_revoked
permission.policy_changed
```

## Audit Record Fields

```text
eventId
requestId
actorId
actorType
workspaceId
projectId
sessionId
action
resource
decision
reason
policyVersion
grantId
createdAt
```

## Failure Behavior

PermissionManager MUST fail closed.

If policies cannot load, deny.

If actor identity cannot be resolved, deny.

If workspace scope is ambiguous, deny.

If approval status is unknown, deny or wait, never allow.

If audit logging fails, high-risk actions MUST be blocked.

## Threat Model

Important threats:

- Worker attempts to write outside workspace
- plugin registers a dangerous tool as harmless
- MCP server exposes destructive action
- prompt injection asks Worker to bypass approval
- terminal command changes after approval
- stale grant remains valid too long
- user enables broad YOLO and forgets
- child Worker inherits too much permission

## Security Requirements

PermissionManager MUST treat child Workers as new actors.

PermissionManager MUST NOT automatically grant a child all parent permissions.

PermissionManager MUST require explicit policy for secret access.

PermissionManager MUST keep approval text and command preview immutable after approval.

## AI Notes

Security docs should be boring in the best way: explicit, repetitive, and hard to misread. If an implementation feels clever, simplify it.

