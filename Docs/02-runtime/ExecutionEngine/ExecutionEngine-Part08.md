---
title: ExecutionEngine Specification - Part 08
status: draft
version: 1.0
tags:
  - runtime
  - execution-engine
  - implementation
related:
  - "[[ExecutionEngine-Part01]]"
  - "[[DatabaseArchitecture]]"
  - "[[EventBus-Part01]]"
---

# ExecutionEngine Specification (Part 08)

## Persistence, UI, Examples, and Implementation Checklist

This part defines how the ExecutionEngine becomes a real product subsystem.

## Suggested Tables

```text
executions
id
workspace_id
project_id
session_id
task_id
workflow_id
node_id
owner_type
owner_id
execution_kind
adapter_kind
state
permission_decision_id
input_json
result_json
error_json
resource_limits_json
retry_policy_json
created_at
started_at
finished_at

execution_events
id
execution_id
event_type
payload_json
sequence
created_at

execution_logs
id
execution_id
stream
level
message
payload_json
sequence
created_at
```

## UI Representation

The UI SHOULD expose execution through:

- Worker terminal panels
- workflow node status
- task detail view
- runtime activity panel
- logs panel
- replay timeline
- metrics dashboard

Each execution should be inspectable without opening the raw database.

## Example Execution

```text
Task: Implement settings panel
Scheduler: ready
ExecutionEngine: worker_prompt
WorkerAdapter: starts AI CLI Worker
Worker: creates patch artifact
ArtifactManager: stores patch
Verifier: checks patch
MergeManager: applies patch
ExecutionResult: completed
```

## Implementation Checklist

- Define ExecutionUnit TypeScript type
- Define ExecutionResult TypeScript type
- Define ExecutionState enum
- Create execution database tables
- Create execution repository
- Create ExecutionEngine service
- Create adapter interface
- Implement TerminalAdapter
- Implement WorkerAdapter
- Implement ToolAdapter
- Implement WorkflowNodeAdapter
- Add permission decision validation
- Add event emission
- Add log capture
- Add cancellation path
- Add timeout handling
- Add tests for invalid transitions
- Add tests for permission denial
- Add tests for cancellation cleanup
- Add UI execution inspector

## Common Mistakes

- running commands directly from UI components
- storing execution state only in memory
- treating logs as state
- allowing plugins to bypass ExecutionEngine
- retrying non-idempotent commands automatically
- hiding failed cleanup

## Future Expansion

Future versions may support:

- remote execution hosts
- distributed Workers
- containerized execution
- per-execution snapshots
- deterministic simulation mode
- full replay of external tool calls

## AI Notes

If an AI coding assistant is asked to "run a task", it should look for the ExecutionEngine boundary first.

The correct flow is usually:

```text
Create Task -> Scheduler -> ExecutionEngine -> Adapter -> Result
```

Do not invent direct shortcuts.

