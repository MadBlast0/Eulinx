---
title: ModelSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - model
related:
  - "[[01-core-concepts/README]]"
  - "[Model-Part01]"
  - "[Model-Part04]"
---

# Model Specification (Part 05)

## Runtime Integration

The Runtime is responsible for coordinating all Model execution.

Workers never invoke Models directly.

Execution Flow

Worker
↓
Runtime
↓
Provider Manager
↓
Model Selection
↓
Context Builder
↓
Inference
↓
Response Normalization
↓
Worker

---

## Context Assembly

Before inference, the Runtime assembles:

- User request
- Relevant Memory
- Task context
- Workspace configuration
- Artifacts
- Tool definitions
- Model profile

Only relevant information SHOULD be included.

---

## Response Processing

The Runtime normalizes:

- Text output
- Tool calls
- Structured data
- Usage metrics
- Finish reasons
- Errors

Responses become Runtime events and may generate Artifacts.

---

## Scheduling

The Scheduler balances:

- Cost
- Latency
- Queue depth
- Model health
- Priority

High-priority tasks MAY preempt lower-priority requests.

---

## AI Notes

The Runtime owns execution orchestration.

Models provide inference only; they never manage execution state.

