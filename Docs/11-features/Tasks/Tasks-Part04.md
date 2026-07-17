---
title: Tasks Specification - Part 04
status: draft
version: 1.0
tags:
  - features
  - tasks
related:
  - "[[Tasks-Part03]]"
  - "[[Tasks-Part05]]"
  - "[[Scheduler-Part01]]"
---

# Tasks Specification (Part 04)

## Document Index

Part 01 - Purpose, Scope, and the Task Object
Part 02 - Natural-Language Capture and Decomposition
Part 03 - Assignment, Execution, and Evidence
Part 04 - Recurring Tasks and Scheduling
Part 05 - Progress Aggregation and AI Notes

# Recurring Tasks

A task may be recurring. Recurrence is defined by a schedule (cron-like) or a trigger condition. Recurring tasks are a specialization of Automations; the Tasks feature registers them with the Scheduler and renders their next-run and last-run state.

# Scheduling

The Scheduler admits tasks based on:

- resource availability (ResourceManager admission)
- dependencies satisfied
- worker concurrency limits per plan
- token / cost budget remaining

A recurring task that would exceed a budget MUST be deferred and surfaced as a notification, never silently dropped.

# Triggers

Beyond schedule, a task may be triggered by:

- a file change in the project
- a workflow event
- an agent output matching a condition
- a manual user action

# Related Documents

- [[Tasks-Part05]]
- [[Scheduler-Part01]]
