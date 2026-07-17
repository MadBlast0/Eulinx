---
title: ServiceAPI Specification - Part 03
status: draft
version: 1.0
tags:
  - api
  - service-api
  - messages
related:
  - "[[15-api/README]]"
  - "[[ServiceAPI-Part01]]"
  - "[[ServiceAPI-Part02]]"
  - "[[ServiceAPI-Part04]]"
  - "[[Contracts-Part04]]"
  - "[[EventBus-Part01]]"
---

# ServiceAPI Specification (Part 03)

## Document Index

Part 01 - The internal service-to-service boundary, in-process calls, and service traits
Part 02 - The service call graph and who may call whom
Part 03 - The in-process message shapes and the no-Tauri rule
Part 04 - The service rules: deterministic, no LLM, business logic lives here

# Purpose

This part specifies the shapes that travel on the ServiceAPI boundary. Because the boundary is in-process, these are Rust types, not JSON â€” but they MUST stay consistent with the wire contracts in [[Contracts-Part03]] and [[Contracts-Part04]], because the RustAPI handler converts between them at the edge. The rule is: internal types are the source for behavior; the Contracts are the source for the wire; the handler is the only translator.

# The No-Tauri Rule

ServiceAPI messages MUST NOT contain anything that implies a Tauri transport: no `Invoke`, no `Event`, no window handle, no `AppHandle` threaded through every call. A service that needs to emit a fact calls the EventBus trait; it does not hold an `AppHandle`. The `AppHandle` lives at the edge (the command layer and the EventBus Tauri bridge), not inside services. This is what keeps services testable without a running Tauri app.

# Message Shapes

A ServiceAPI call takes a typed request struct and returns `Result<Response, ServiceError>`. The shapes mirror the contract request/response but may carry richer Rust types (e.g., a real `Uuid` rather than a `String`, a `chrono` timestamp rather than an ISO string) because there is no serialization. The handler at the edge converts the wire `String`/`serde_json::Value` into these types and back.

Examples of internal request/response pairs (field names canonical in [[Contracts-Part03]] and [[Contracts-Part04]]):

- `SpawnWorkerRequest { prompt, parent_id, refinement_mode, correlation_id }` â†’ `WorkerSummary`
- `RequestLockRequest { resource, owner, scope }` â†’ `LockGrant { granted, owner?, waiters }`
- `SubmitMergeRequest { artifact_id, target }` â†’ `MergeReceipt { accepted, conflict_ids? }`
- `VerifyArtifactRequest { artifact_id, verifier }` â†’ `VerificationResult { passed, findings }`

The exact field lists are defined in Contracts; this part states the rule that internal types are the behavioral source and MUST round-trip cleanly to the wire.

# ServiceError

`ServiceError` is the internal error type. It carries a `code` (the same enum as the RustAPI `ApiErrorCode`, see [[Contracts-Part05]]), a message, and retryability. The command handler maps `ServiceError` to `ApiError` without loss of `code`. A service MUST NOT return a stringly error; the `code` is what lets the frontend branch and lets retry logic work ([[FrontendAPI-Part03]]).

# Event Publication Shapes

When a service publishes, it builds a `EulinxEvent` (defined in [[EventBus-Part01]]) with `type`, `payload`, `workspace_id`, `correlation_id`, and `replay_grade`. The payload is a Rust struct serialized to JSON by the EventBus for the wire. The payload MUST be plain data (the EventBus forbids live objects, [[EventBus-Part01]]), so the same no-handle rule that governs IPC governs service-to-bus publication.

# Consistency with Contracts

The contract in [[Contracts-Part01]] through [[Contracts-Part04]] is the wire truth. If a service's internal type gains a field that must cross IPC, the contract MUST be updated first ([[Contracts-Part06]]), then the handler mapping. The reverse is also true: a wire contract field with no internal representation is a bug.

# AI Notes

Do not thread `AppHandle` through services. Use the EventBus trait to publish; keep `AppHandle` at the edge. Services that need Tauri are not services.

Do not return a string error from a service. Use `ServiceError` with a `code` so the handler can map it and the frontend can branch.

Do not put a live object in an event payload. The EventBus rejects it conceptually; serialize plain data only.

Do not let an internal type drift from its contract. Update Contracts first, then the handler mapping, or the wire and behavior diverge.

# Related Documents

- [[15-api/README]]
- [[ServiceAPI-Part01]]
- [[ServiceAPI-Part02]]
- [[ServiceAPI-Part04]]
- [[Contracts-Part03]]
- [[Contracts-Part04]]
- [[Contracts-Part05]]
- [[EventBus-Part01]]
- [[RustAPI-Part03]]
