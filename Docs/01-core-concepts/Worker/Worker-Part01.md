---
title: WorkerSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - worker
related:
  - "[[01-core-concepts/README]]"
  - "[[Worker-Part01]]"
  - "[[Runtime-Part01]]"
  - "[[Workflow-Part01]]"
---
# Worker Specification (Part 1)

## Purpose
A Worker is the smallest autonomous execution unit in Eulinx.

## Philosophy
Workers execute work, not conversations.

## Responsibilities
- Belong to one Workspace
- Belong to one Project
- Execute one active objective
- Produce artifacts
- Report progress

## Initial Object Model
- id
- workspaceId
- projectId
- parentWorkerId
- orchestratorId
- taskId
- terminalId
- provider
- model
- prompt
- context
- permissions
- state
- metrics
- artifacts

