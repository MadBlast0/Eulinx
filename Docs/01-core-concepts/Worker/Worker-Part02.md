---
title: WorkerSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - worker
related:
  - "[[01-core-concepts/README]]"
  - "[Worker-Part01]"
  - "[Worker-Part01]"
---
# Worker Specification (Part 2)

## Complete Object Model
- id
- workspaceId
- projectId
- parentWorkerId
- childWorkerIds
- orchestratorId
- taskId
- terminalId
- provider
- model
- prompt
- context
- permissions
- memoryId
- artifactIds
- metrics
- state

## Worker States
Created
Initializing
Planning
Running
Waiting
Blocked
Reviewing
Completed
Failed
Archived
Destroyed

