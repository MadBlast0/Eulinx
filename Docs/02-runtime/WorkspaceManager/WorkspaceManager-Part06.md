---
title: WorkspaceManager Specification - Part 06
status: draft
version: 1.0
tags:
  - runtime
  - workspace-manager
  - implementation
related:
  - "[[WorkspaceManager-Part01]]"
  - "[[Workspace-Part01]]"
  - "[[Project-Part01]]"
---

# WorkspaceManager Specification (Part 06)

## UI, Examples, AI Notes, and Implementation Checklist

## UI Representation

The UI SHOULD show:

- active Workspace name
- active Project
- Workspace health
- sync/indexing status
- recent runtime activity
- warnings for degraded state
- clear controls for open, close, switch, and inspect

The UI MUST NOT allow the user to believe a Worker is operating in one Workspace while runtime state points to another.

## Example

User opens `C:\Projects\EulinxApp`.

WorkspaceManager:

```text
validates root
opens workspace database
loads settings
binds runtime
starts file watchers
emits workspace.opened
allows Scheduler to resume
```

## Suggested Tables

```text
workspaces
id
name
root_path
manifest_version
last_opened_at
created_at
updated_at

workspace_runtime_state
workspace_id
state
active_project_id
health_json
settings_json
updated_at
```

## Implementation Checklist

- Define WorkspaceRuntimeContext
- Implement openWorkspace
- Implement closeWorkspace
- Implement switchWorkspace
- Implement path validation
- Add Workspace events
- Add database metadata persistence
- Add degraded state handling
- Add startup recovery
- Add UI active Workspace indicator
- Add tests for path escaping
- Add tests for Workspace switching
- Add tests for missing database recovery

## Common Mistakes

- storing active Workspace only in UI state
- allowing relative paths without normalization
- keeping stale Workspace references after switch
- sharing memory indexes between Workspaces
- letting Workers run during unsafe Workspace close

## Related Documents

- [[Workspace-Part01]]
- [[Project-Part01]]
- [[RuntimeManager-Part01]]
- [[ExecutionEngine-Part01]]
- [[Permission-Part01]]

