---
title: RuntimeSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - runtime
related:
  - "[[01-core-concepts/README]]"
  - "[[Worker-Part01]]"
  - "[[Runtime-Part01]]"
  - "[[Workflow-Part01]]"
---

# Runtime Specification (Part 1)

## Purpose

The Runtime is the deterministic execution engine of Eulinx.

It coordinates all execution but does not perform AI reasoning.

## Responsibilities

- Manage Workspaces
- Manage Sessions
- Start and stop Workers
- Manage Orchestrators
- Coordinate Runtime Services
- Emit Events

## Runtime Services

- Scheduler
- Merge Manager
- Lock Manager
- Permission Manager
- Memory Manager
- Context Manager
- Event Bus

## Rules

MUST:
- Remain deterministic
- Own execution lifecycle
- Enforce workspace isolation

MUST NOT:
- Replace AI reasoning
- Modify projects outside verified artifact flow

## Runtime Flow

User Goal
↓
Runtime
↓
Orchestrators
↓
Workers
↓
Artifacts
↓
Verification
↓
Merge

