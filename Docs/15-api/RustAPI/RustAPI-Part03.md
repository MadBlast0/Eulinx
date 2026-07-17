---
title: RustAPI Specification - Part 03
status: draft
version: 1.0
tags:
  - api
  - rust-api
  - dispatch
  - permission
related:
  - "[[15-api/README]]"
  - "[[RustAPI-Part01]]"
  - "[[RustAPI-Part02]]"
  - "[[RustAPI-Part04]]"
  - "[[ServiceAPI-Part01]]"
  - "[[PermissionManager-Part01]]"
  - "[[IPC-Part04]]"
  - "[[Contracts-Part05]]"
---

# RustAPI Specification (Part 03)

## Document Index

Part 01 - The Tauri command-handler surface, the thin-backend rule, and dispatch
Part 02 - Argument and return shapes, the async/sync split, and streaming commands
Part 03 - Dispatch to ServiceAPI, the PermissionManager check, and error mapping
Part 04 - The native OS surface: filesystem, PTY, window, secure store

# Purpose

This part specifies what a command handler does between receiving arguments and returning: how it validates, how it checks permission, how it delegates to a ServiceAPI entry point, and how it maps service outcomes into the contract result or the `ApiError` envelope. It is the backend half of the error and scope contract in [[IPC-Part04]].

# The Handler Sequence

A well-formed handler performs the following steps in order. Skipping a step is a defect.

1. **Extract scope.** Read `workspace_id` from args or app state. If absent or not attached to the caller session, return `workspace_scope_mismatch` and perform no side effect.
2. **Validate.** Check presence, JSON types, enum values, and size limits. On failure return `validation_error` with the offending `field` in `context`.
3. **Authorize.** Call the PermissionManager with the command name, the `workspace_id`, and the relevant resource id (e.g., the file path for a `fs` command). If denied, return `permission_denied` and perform no side effect. For destructive commands, also require the pending human-approval grant ([[PermissionManager-Part01]]).
4. **Delegate.** Call exactly one ServiceAPI entry point, passing the validated args and `correlation_id`.
5. **Map.** On `Ok`, serialize the contract result. On `Err`, convert the service error into `ApiError` with the matching `code` from [[Contracts-Part05]] and `retryable` from the service's own classification.
6. **Return.** Hand the result or envelope to Tauri; do not publish events (the service does).

# Permission Check

The PermissionManager is the only authority. The handler MUST NOT invent its own permission logic. The check takes the capability name (e.g., `filesystem.write`, `git.push`, `terminal.run`, `browser`, `publish`) and the workspace scope, and returns allow/deny. Destructive capabilities additionally consult the approval gate: even if the capability is granted, an unapproved destructive action returns `approval_required` and performs nothing.

The UI may have hidden the control, but the RustAPI re-checks regardless. A disabled button is a courtesy, never a control ([[IPC-Part04]]).

# Error Mapping

ServiceAPI errors map to `ApiError` codes as follows (canonical list in [[Contracts-Part05]]):

- not-found conditions → `worker_not_found`, `artifact_not_found`, `task_not_found`, etc.
- lock contention → `lock_conflict` (retryable, with `owner` in context)
- merge conflict → `merge_conflict` (retryable, with conflict ids)
- verification failure → `artifact_verify_failed` (non-retryable; the output is the judge)
- permission denied → `permission_denied` (non-retryable)
- approval missing → `approval_required` (non-retryable)
- workspace mismatch → `workspace_scope_mismatch` (non-retryable, indicates client bug)
- validation → `validation_error` (non-retryable, with `field`)
- internal/panic → `internal_error` (with `trace_id`, never a raw stack trace)

The mapping is total: every service error has exactly one `code`. The handler MUST NOT return a service error as a string.

# No Side Effect on Failure

A fundamental rule: if validation or authorization fails, the handler MUST NOT have performed any observable side effect. It must not have spawned a Worker, written a file, or granted a lock. The check order (scope → validate → authorize → delegate) guarantees this, because delegation — the only step that causes effects — comes last.

# AI Notes

Do not put business logic before the delegate step. Validate and authorize, then call the service. Logic in the handler is the thin-backend violation.

Do not return `permission_denied` without calling the PermissionManager. The manager is the authority; guessing is wrong and inconsistent.

Do not perform an effect before the permission check. A Worker spawned then killed on a deny is a side effect and a race.

Do not leak a panic. Catch at the handler boundary and return `internal_error` with a `trace_id`; the UI must never see a Rust backtrace.

Do not return a service error as a string. Map it to a `code` in [[Contracts-Part05]] so the frontend branches correctly.

# Related Documents

- [[15-api/README]]
- [[RustAPI-Part01]]
- [[RustAPI-Part02]]
- [[RustAPI-Part04]]
- [[ServiceAPI-Part01]]
- [[PermissionManager-Part01]]
- [[IPC-Part04]]
- [[Contracts-Part05]]
- [[EventBus-Part01]]
