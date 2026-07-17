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
  - "[Orchestrator-Part02]"
---

# Orchestrator Specification (Part 3)

## Failure Handling

When a Worker fails:

1. Capture failure details
2. Save logs
3. Determine retry eligibility
4. Retry or replace Worker
5. Escalate unresolved failures

## Artifact Aggregation

Child Workers submit artifacts.

The Orchestrator:
- validates completeness
- combines related artifacts
- forwards them for verification

## Scheduling

Orchestrators SHOULD:
- maximize parallel execution
- avoid resource contention
- minimize idle Workers

## Metrics

Track:
- Active Workers
- Completed Tasks
- Failed Tasks
- Retry Count
- Total Duration
- Estimated Remaining Time

## Security

MUST:
- Respect workspace isolation
- Respect permission scopes
- Never bypass Merge Manager
- Never bypass Runtime Services

## Future Expansion

- Distributed orchestration
- Cross-machine execution
- Adaptive planning
- Cost-aware scheduling

