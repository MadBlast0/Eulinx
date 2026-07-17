---
title: OrchestratorSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - orchestrator
related:
  - "[[01-core-concepts/README]]"
  - "[Orchestrator-Part01]"
  - "[Orchestrator-Part01]"
---

# Orchestrator Specification (Part 2)

## Lifecycle

Created
↓
Planning
↓
Delegating
↓
Monitoring
↓
Aggregating
↓
Reporting
↓
Completed
↓
Archived

## Child Orchestrators

An Orchestrator MAY create child Orchestrators to divide large scopes into smaller phases.

Example:

Root
├── Backend
├── Frontend
├── Testing

Each child owns only its assigned scope.

## Worker Management

Responsibilities:
- Spawn Workers
- Assign Tasks
- Monitor Progress
- Retry Failed Work
- Escalate Blocking Issues

## Progress Tracking

Track:
- Completed Tasks
- Running Workers
- Failed Workers
- Pending Work
- Estimated Completion

## Communication

Orchestrators communicate through runtime events and structured artifacts.

They SHOULD summarize information before sending it upward.

## Rules

MUST:
- Keep hierarchy acyclic
- Prevent duplicate work
- Report completion only after verification

