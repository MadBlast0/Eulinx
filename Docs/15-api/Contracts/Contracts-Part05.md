---
title: Contracts Specification - Part 05
status: draft
version: 1.0
tags:
  - api
  - contracts
  - error-codes
related:
  - "[[15-api/README]]"
  - "[[Contracts-Part01]]"
  - "[[Contracts-Part03]]"
  - "[[Contracts-Part04]]"
  - "[[Contracts-Part06]]"
  - "[[IPC-Part01]]"
  - "[[IPC-Part04]]"
  - "[[FrontendAPI-Part03]]"
---

# Contracts Specification (Part 05)

## Document Index

Part 01 - The command name registry (invoke commands)
Part 02 - The event name registry (Eulinx:// events)
Part 03 - Request and response shapes per command
Part 04 - Shared field and envelope types
Part 05 - The error code registry
Part 06 - API versioning and the change log

# Purpose

This part is the error code registry: the closed set of `code` values carried in the `ApiError` envelope ([[Contracts-Part04]]) and the `ServiceError` ([[ServiceAPI-Part03]]) and the PluginAPI error object ([[PluginAPI-Part04]]). The UI branches on `code` and nothing else ([[FrontendAPI-Part03]]), so this list is the contract for all failure handling. Every code below lists its meaning, its retryability, and the layer that originates it.

# The Code Registry

## Validation and scope

- `validation_error` — a request argument was missing, wrong type, or out of allowed range. Non-retryable. `context.field` names the offender. Originated by the command handler ([[RustAPI-Part03]]).
- `workspace_scope_mismatch` — `workspace_id` missing or not attached to the caller. Non-retryable; indicates a client bug. Originated by the command handler.

## Permission and approval

- `permission_denied` — the PermissionManager denied the capability. Non-retryable. Originated by PermissionManager ([[PermissionManager-Part01]], [[IPC-Part04]]).
- `approval_required` — the capability is granted but the destructive action lacks a human-approval grant. Non-retryable. Originated by the command handler after the approval check.
- `grant_required` — plugin-specific: the plugin's grant lacks the needed capability. Non-retryable. Originated by the PluginAPI broker ([[PluginAPI-Part04]]).

## Not found

- `worker_not_found` — no Worker with the given id in the workspace. Non-retryable.
- `task_not_found` — no Task with the given id. Non-retryable.
- `artifact_not_found` — no Artifact with the given id. Non-retryable.
- `session_not_found` — no Session with the given id. Non-retryable.
- `plugin_not_found` — no plugin with the given id. Non-retryable.

## Contention (retryable)

- `lock_conflict` — the requested lock is held by another owner. Retryable; `context.owner` and `waiters` help the caller back off. Originated by LockManager ([[LockManager-Part01]]).
- `merge_conflict` — the Artifact merge hit unresolved conflicts. Retryable; `context.conflict_ids` lists them. Originated by MergeManager ([[MergeManager-Part01]]).

## Verification and execution

- `artifact_verify_failed` — the verifier reported failure. Non-retryable; the output is the judge, not an error to retry. `context.findings` carries detail. Originated by Verifier.
- `execution_failed` — the Execution ended in failure. Non-retryable.
- `refinement_budget_exceeded` — the refinement loop hit its token/cost budget. Non-retryable; the user may raise the budget. Originated by the refinement coordinator ([[10-ai-system/README]]).

## Runtime and transport

- `runtime_unavailable` — the Rust Runtime is not connected. Non-retryable at the call level; the UI enters degraded mode ([[FrontendAPI-Part05]]).
- `internal_error` — an unexpected backend failure or caught panic. Non-retryable; `context.trace_id` aids diagnosis. Never a raw stack trace.
- `payload_too_large` — a request or event exceeded the size ceiling. Non-retryable; use a reference instead.

## Plugin-specific

- `timeout` — a plugin broker call exceeded its per-call timeout. Non-retryable for that call; the plugin may be quarantined. Originated by PluginAPI broker ([[PluginAPI-Part04]]).
- `quota_exceeded` — the plugin exceeded its rate or size budget. Non-retryable for that call.
- `method_unknown` — the plugin sent a JSON-RPC method the broker does not expose. Non-retryable.
- `malformed_request` — the plugin's JSON-RPC request did not parse. Non-retryable.

# Retryability Rule

Only `lock_conflict` and `merge_conflict` are retryable. Every other code is final; retrying it is a bug or an attack ([[FrontendAPI-Part03]]). The `context.retryable` flag always reflects this and the UI MUST honor it.

# AI Notes

Do not branch UI logic on `message`. Use `code`. Messages change; codes are the contract.

Do not retry `permission_denied`. It will be denied again and you build a permission-spam loop.

Do not add a code without listing it here. The set is closed; add it, then use it in the handler mapping.

Do not return a raw panic. Map to `internal_error` with `trace_id`; the UI must never see a backtrace ([[IPC-Part04]]).

Do not invent a stringly error in a service. Use `ServiceError` with one of these codes so the handler can map it ([[ServiceAPI-Part03]]).

# Related Documents

- [[15-api/README]]
- [[Contracts-Part01]]
- [[Contracts-Part03]]
- [[Contracts-Part04]]
- [[Contracts-Part06]]
- [[IPC-Part01]]
- [[IPC-Part04]]
- [[FrontendAPI-Part03]]
- [[ServiceAPI-Part03]]
- [[PluginAPI-Part04]]
- [[PermissionManager-Part01]]
- [[LockManager-Part01]]
- [[MergeManager-Part01]]
