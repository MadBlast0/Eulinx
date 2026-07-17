---
title: OrchestratorSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - orchestrator
related:
  - "[[01-core-concepts/README]]"
  - "[[Worker-Part01]]"
  - "[[Runtime-Part01]]"
  - "[[Workflow-Part01]]"
---

# Orchestrator Specification (Part 1)

## Purpose

An Orchestrator coordinates work. It plans, delegates, monitors progress, and aggregates results from Workers.

Orchestrators are runtime coordination components, not permanent AI personalities.

## Responsibilities

- Receive objectives
- Create execution plans
- Spawn Workers
- Spawn child Orchestrators when necessary
- Track progress
- Aggregate results
- Report upward

## Hierarchy

User
↓
Root Orchestrator
↓
Phase Orchestrators
↓
Task Orchestrators
↓
Workers

## Rules

MUST:
- Own assigned scope
- Delegate instead of doing implementation work
- Track child execution

MUST NOT:
- Modify project files directly
- Bypass runtime services
- Ignore worker failures

## Object Model

- id
- workspaceId
- projectId
- parentId
- childOrchestrators
- workers
- assignedScope
- state
- metrics

