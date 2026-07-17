---
title: ExecutionEngine Specification - Part 02
status: draft
version: 1.0
tags:
  - runtime
  - execution-engine
  - execution-unit
related:
  - "[[ExecutionEngine-Part01]]"
  - "[[Task-Part01]]"
  - "[[Workflow-Part01]]"
---

# ExecutionEngine Specification (Part 02)

## Execution Unit Model

An Execution Unit is the smallest runtime object the ExecutionEngine can run.

It is not the same as a Task. A [[Task]] may produce many execution units. A [[Workflow]] node may be one execution unit. A Worker terminal command may be one execution unit. A merge request may be one execution unit.

## Required Fields

Every Execution Unit MUST include:

```text
ExecutionUnit
id
workspaceId
projectId
sessionId
taskId
workflowId optional
nodeId optional
ownerType
ownerId
requestedBy
executionKind
adapterKind
input
expectedOutput
permissionDecisionId
resourceLimits
timeoutPolicy
retryPolicy
priority
createdAt
```

## Execution Kinds

Eulinx SHOULD support these execution kinds:

- worker_prompt
- worker_command
- terminal_command
- tool_invocation
- workflow_node
- verification
- merge
- memory_index
- artifact_transform
- replay_step
- runtime_maintenance

## Adapter Kinds

Adapter kind tells the ExecutionEngine how to run the unit.

```text
terminal
worker
tool
workflow
verifier
merge
memory
artifact
internal
```

The adapter is responsible for translating the generic execution unit into concrete process, tool, or service calls.

## Contract Rules

An Execution Unit MUST be immutable after it starts.

If runtime information changes during execution, it MUST be recorded as events, logs, metrics, or result fields. The original input must remain preserved for replay.

An Execution Unit MUST NOT contain large raw context blobs when the same information can be referenced as an [[Artifact]], Memory entry, file path, or Knowledge item.

## Input Contract

Input SHOULD be structured:

```yaml
input:
  promptRef: prompt_123
  artifacts:
    - artifact_auth_plan
  files:
    read:
      - src/auth/index.ts
    write:
      - src/auth/session.ts
  command: optional
  environment:
    EULINX_WORKER_ID: worker_123
```

## Output Contract

Execution output MUST be normalized:

```text
ExecutionResult
id
executionUnitId
state
exitCode optional
summary
artifacts[]
events[]
logsRef
metrics
error optional
startedAt
finishedAt
```

## Runtime Contract Diagram

```mermaid
flowchart LR
    EU["ExecutionUnit"] --> V["Validate Contract"]
    V --> P["Check Permission Decision"]
    P --> A["Select Adapter"]
    A --> R["Run"]
    R --> ER["ExecutionResult"]
```

## Example

A frontend phase orchestrator creates a task to implement a settings panel.

The Scheduler breaks it into execution units:

- ask Worker to inspect existing UI conventions
- ask Worker to create a patch artifact
- run tests
- run verifier
- merge patch

The ExecutionEngine sees five different execution units, not one vague instruction.

## AI Notes

Low-cost coding models should treat ExecutionUnit as a strict data contract. Do not pass arbitrary objects into the ExecutionEngine.

When unsure, add a field to `input` or `expectedOutput`, but keep the top-level contract stable.

