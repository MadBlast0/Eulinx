---
title: Context Manager Part 04 - Permissions and Redaction
status: draft
version: 1.0
tags:
  - runtime
  - context-manager
  - redaction
related:
  - "[[PermissionManager-Part01]]"
  - "[[WorkspaceManager-Part01]]"
---

# Context Manager Part 04 - Permissions and Redaction

## Purpose

ContextManager must ensure actors receive only authorized information.

## Redaction Targets

```text
secrets
tokens
private memory
other workspace data
unapproved files
credentials
personal user data
plugin private state
```

## Permission Checks

Before including context, ContextManager MUST ask PermissionManager whether the actor can access that source.

## Redaction Record

Every redaction SHOULD be recorded:

```text
sourceId
redactionType
reason
policyId
createdAt
```

## AI Notes

Do not rely on "the model probably will not misuse it." If context is not authorized, do not include it.

