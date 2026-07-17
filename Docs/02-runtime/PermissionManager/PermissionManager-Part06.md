---
title: Permission Manager Part 06 - Database, UI, Tests
status: draft
version: 1.0
tags:
  - runtime
  - permission-manager
  - database
  - ui
related:
  - "[[PermissionManager-Part01]]"
  - "[[DatabaseArchitecture]]"
  - "[[EventBus-Part01]]"
---

# Permission Manager Part 06 - Database, UI, Tests

## Purpose

This part defines persistence, UI representation, testing strategy, and implementation checklist for PermissionManager.

## Database Tables

Suggested tables:

```text
permission_policies
permission_grants
permission_requests
permission_decisions
permission_approval_tickets
permission_audit_events
```

## Policy Table Shape

```text
permission_policies
  id
  scope_type
  scope_id
  policy_json
  version
  created_at
  updated_at
```

## Grant Table Shape

```text
permission_grants
  id
  actor_id
  actor_type
  workspace_id
  project_id
  session_id
  actions_json
  resources_json
  risk_limit
  expires_at
  revoked_at
  created_at
```

## UI Surfaces

Eulinx should expose:

- approval dialog
- permissions panel per Worker
- workspace policy settings
- session YOLO indicator
- audit log
- revoked grants list
- high-risk action warnings

## UI Rule

The UI MUST show permissions as concrete actions, not vague trust labels.

Good:

```text
Allow Worker 12 to write files in src/auth for this task only.
```

Bad:

```text
Trust this Worker.
```

## Tests

Required test groups:

- hard deny precedence
- expired grants
- child Worker inheritance
- command mutation after approval
- workspace path escape
- plugin tool permission declaration
- audit event creation
- fail-closed behavior

## Implementation Checklist

```text
[ ] PermissionRequest type
[ ] PermissionDecision type
[ ] PermissionGrant type
[ ] policy store
[ ] grant store
[ ] approval ticket store
[ ] audit event writer
[ ] UI approval flow
[ ] integration with WorkerSpawner
[ ] integration with ToolRegistry
[ ] integration with MergeManager
[ ] unit tests
[ ] integration tests
```

## Related Documents

- [[Permission-Part01]]
- [[RuntimeRules-Part01]]
- [[WorkerSpawner-Part01]]
- [[ToolRegistry-Part01]]
- [[MergeManager-Part01]]

