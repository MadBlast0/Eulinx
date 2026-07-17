---
title: FrontendAPI Specification - Part 03
status: draft
version: 1.0
tags:
  - api
  - frontend-api
  - errors
  - commands
related:
  - "[[15-api/README]]"
  - "[[FrontendAPI-Part01]]"
  - "[[FrontendAPI-Part02]]"
  - "[[FrontendAPI-Part04]]"
  - "[[IPC-Part01]]"
  - "[[Contracts-Part05]]"
---

# FrontendAPI Specification (Part 03)

## Document Index

Part 01 - The TypeScript client surface, service modules, and the no-direct-Tauri rule
Part 02 - The runtime store mirror, the three state tiers, and the store slices
Part 03 - Command-call ergonomics, the `ApiError` type, and retry rules
Part 04 - The event subscription manager and idempotent handlers
Part 05 - Frontend API rules: no direct Tauri, idempotency, view state, degraded runtime

# Purpose

This part specifies the ergonomics of calling a command from the frontend: how a service function wraps `invoke`, how the error envelope becomes a typed `ApiError`, and when a retry is permitted. It is the frontend half of the error contract defined in [[IPC-Part01]] and [[IPC-Part04]].

# The Command Call Shape

A service command function has the shape: it takes a typed args object, returns `Promise<Result>`, and rejects with `ApiError`. It MUST NOT return a raw Tauri rejection. The transport adapter catches the rejection, normalizes it, and rethrows the `ApiError`.

A command function MUST:

- require the args type defined in [[Contracts-Part03]] for that command
- omit `workspaceId` from its public signature when the active workspace is implied; the adapter injects it
- accept an optional `correlationId` so the caller can match the resulting events
- never `await` an event; commands are request/response only

Example contract (names and fields from [[Contracts-Part01]] and [[Contracts-Part03]]): a call to spawn a Worker supplies `prompt`, `parentId?`, `refinementMode`, and returns a `WorkerSummary` containing `id`, `state`, `createdAt`. The exact field list is canonical in Contracts, not here.

# The ApiError Type

`ApiError` is the normalized frontend error. It carries the same three fields as the wire envelope ([[IPC-Part01]]):

- `code` — stable string from [[Contracts-Part05]]; the only field the UI branches on.
- `message` — human sentence for a toast or log.
- `context` — optional object with `retryable`, `field`, `offendingId`, `owner`, or `traceId`.

The frontend MUST branch logic on `code`, never on `message`. The `context.retryable` flag decides whether a caller may retry. The adapter sets `retryable` from the backend value; if the backend omitted it, the adapter defaults non-retryable for safety.

# Retry Rules

A command MAY be retried only when `context.retryable` is true. Retryable codes include `lock_conflict` and `merge_conflict`: the caller should back off and retry, possibly after the conflicting owner releases. Non-retryable codes — `permission_denied`, `workspace_scope_mismatch`, `validation_error`, `internal_error` — MUST NOT be retried by the caller; doing so is a bug or an attack.

A retry MUST carry the original `correlationId` so the Runtime and EventBus can associate the new attempt with the prior one. The caller MUST cap retries (a small fixed count with exponential backoff) and surface a final failure to the user rather than spinning forever.

# Result Mapping

On success, the adapter maps the wire result to the typed result defined in [[Contracts-Part03]]. The mapping is structural, not nominal: if the wire object has the expected fields, it is accepted; if a required field is missing, the adapter throws `internal_error` with `traceId` rather than letting the UI crash on `undefined`. This protects the cheap coding model from silent shape drift.

# Cancellation

A command is not cancellable once sent; the Runtime owns the action. If the user "cancels" a spawn, that is a separate command (`terminate_worker`) sent afterward, not an abort of the original `invoke`. The frontend MUST NOT assume an `invoke` can be undone by ignoring its promise.

# AI Notes

Do not branch error UI on `message` text. Use `code`. Messages change; codes are the contract in [[Contracts-Part05]].

Do not retry `permission_denied`. It will be denied again and you have built a permission-spam loop.

Do not `await` an event inside a command function. Commands return once; the confirmation arrives later as an event handled by the store reducer.

Do not swallow `ApiError`. Either handle the specific `code` or show the message; never `catch` and continue as if success.

Do not assume the result shape from memory. Map through the Contract type; if the backend added a field, extend Contracts, do not loosen the type to `any`.

# Related Documents

- [[15-api/README]]
- [[FrontendAPI-Part01]]
- [[FrontendAPI-Part02]]
- [[FrontendAPI-Part04]]
- [[IPC-Part01]]
- [[IPC-Part04]]
- [[Contracts-Part03]]
- [[Contracts-Part05]]
