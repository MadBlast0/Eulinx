---
title: Tasks Specification - Part 01
status: draft
version: 1.0
tags:
  - features
  - tasks
related:
  - "[[11-features/README]]"
  - "[[Tasks-Part02]]"
  - "[[WorkerLifecycle-Part01]]"
---

# Tasks Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and the Task Object
Part 02 - Natural-Language Capture and Decomposition
Part 03 - Assignment, Execution, and Evidence
Part 04 - Recurring Tasks and Scheduling
Part 05 - Progress Aggregation and AI Notes

# Purpose

The Tasks feature makes work a first-class citizen. Agents do work, but what they are working on is a Task, not a chat message. A Task carries title, description, priority, deadline, status, owner, dependencies, outputs, artifacts, logs, verification, and history.

Tasks sit between the user's intent and the worker hierarchy. The user expresses a goal; the system decomposes it; workers execute the resulting tasks; progress rolls up automatically.

# Scope

Tasks are scoped to a workspace. A task belongs to a project folder and references artifacts within that workspace. Cross-project tasks are out of scope for v1.

# The Task Object

A Task is identified by an id and carries:

- title and description
- priority and optional deadline
- status (a lifecycle value)
- owner agent (the worker responsible)
- dependencies (other tasks that must complete first)
- outputs, artifacts, and logs produced
- a verification record
- a history of state transitions

The Task is the unit the Scheduler admits, the LockManager protects, and the Metrics system measures.

# What Tasks Owns

The task feature owns:

- task capture and decomposition UI
- the task list / board surface
- assignment to workers
- recurring and scheduled task definitions
- progress aggregation and the task history view

It does NOT own worker execution, scheduling admission, or verification; those are Runtime services.

# Related Documents

- [[Tasks-Part02]]
- [[WorkerLifecycle-Part01]]
