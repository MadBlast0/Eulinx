---
title: ProviderSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - provider
related:
  - "[[01-core-concepts/README]]"
  - "[Provider-Part01]"
  - "[Provider-Part04]"
---

# Provider Specification (Part 05)

## Request Pipeline

All model requests follow a standardized Runtime pipeline.

Worker
↓
Runtime
↓
Provider Manager
↓
Provider
↓
Model
↓
Streaming / Response
↓
Runtime
↓
Worker

---

## Request Preparation

The Runtime prepares:

- Selected model
- Prompt
- Context
- Tool definitions
- Temperature
- Max tokens
- Response format
- Safety configuration

Provider-specific fields are normalized before transmission.

---

## Streaming

Providers SHOULD support:

- Token streaming
- Partial responses
- Tool call streaming
- Cancellation
- Heartbeats

The Runtime converts all provider formats into a common event stream.

---

## Response Normalization

The Runtime converts provider responses into a unified structure containing:

- Message
- Tool Calls
- Usage
- Finish Reason
- Timing
- Diagnostics

Workers never parse provider-specific payloads.

---

## Cancellation

The Runtime MAY cancel requests when:

- User stops execution
- Session ends
- Timeout expires
- Workspace closes
- Higher-priority work preempts execution

---

## AI Notes

Providers implement transport.

The Runtime owns orchestration and response normalization.

