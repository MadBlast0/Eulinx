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
  - "[Orchestrator-Part03]"
---

# Orchestrator Specification (Part 4)

## Runtime Integration

The Runtime owns Orchestrators.

Orchestrators request actions from Runtime Services rather than performing infrastructure work directly.

## Event Flow

User Goal
↓
Runtime
↓
Root Orchestrator
↓
Phase Orchestrator
↓
Task Orchestrator
↓
Workers
↓
Artifacts
↓
Verification
↓
Merge

## Implementation Checklist

- [ ] Runtime registration
- [ ] Database model
- [ ] Event Bus integration
- [ ] Scheduler integration
- [ ] Worker spawning
- [ ] Progress aggregation
- [ ] Metrics
- [ ] Unit tests
- [ ] Integration tests

## End of Orchestrator Specification

