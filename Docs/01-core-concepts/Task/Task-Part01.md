---
title: TaskSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - task
related:
  - "[[01-core-concepts/README]]"
  - "[[Worker-Part01]]"
  - "[[Runtime-Part01]]"
  - "[[Workflow-Part01]]"
---

# Task Specification (Part 01)

## Purpose

A Task is the smallest logical unit of planned work assigned by an Orchestrator and executed by one or more Workers.

Tasks describe **what** must be accomplished.

Workers determine **how** to accomplish it.

---

## Philosophy

Tasks should be:

- Small
- Independent when possible
- Measurable
- Verifiable
- Traceable

Large objectives are decomposed into Tasks rather than increasing AI context.

---

## Responsibilities

A Task MUST:

- Belong to one Workspace
- Belong to one Project
- Have exactly one parent execution plan
- Define clear success criteria
- Produce one or more Artifacts

---

## Task Hierarchy

Goal
↓
Phase
↓
Task
↓
Subtask
↓
Execution Unit

---

## Core Properties

- id
- workspaceId
- projectId
- parentTaskId
- childTaskIds
- orchestratorId
- assignedWorkerId
- priority
- status
- dependencies
- successCriteria
- artifactIds
- timestamps

---

## Task States

- Created
- Ready
- Running
- Waiting
- Blocked
- Reviewing
- Completed
- Failed
- Cancelled

---

## AI Notes

Tasks define work, not implementation strategy.
The Runtime schedules Tasks.
Workers execute Tasks.

