---
title: IPC Specification - Part 04
status: draft
version: 1.0
tags:
  - api
  - ipc
  - security
  - scope
related:
  - "[[15-api/README]]"
  - "[[IPC-Part01]]"
  - "[[IPC-Part02]]"
  - "[[IPC-Part03]]"
  - "[[Contracts-Part05]]"
  - "[[PermissionManager-Part01]]"
---

# IPC Specification (Part 04)

## Document Index

Part 01 - The two channels, direction rules, serialization, and the error envelope
Part 02 - Command naming, event naming (`Eulinx://`), and the channel dispatch table
Part 03 - Listener lifecycle, batching, throttling, and backpressure
Part 04 - Security, workspace scope, and the error-handling contract

# Purpose

This part specifies the security and correctness contract of the IPC boundary: workspace scoping, permission re-checks, the error-handling rules, and the prohibition on leaking secrets or handles. It is the trust boundary between an untrusted rendering layer (the UI can be driven by any code, including plugins rendering panels) and the trusted Runtime.

# Workspace Scope

Every `invoke` command MUST carry a `workspaceId` argument. Every event payload MUST carry a `workspaceId` field. The IPC layer MUST reject (with `workspace_scope_mismatch`) any command that omits it or that names a workspace the caller is not attached to. The Runtime Manager enforces this before dispatch.

No event MUST cross a Workspace boundary without an explicit subscription scope. The EventBus tags every event with a `workspaceId` (see [[EventBus-Part01]]), and the UI subscription manager filters by it; an event whose `workspaceId` differs from the active workspace is dropped at the boundary, never delivered to a handler.

# Permission Re-Check

The UI MAY hide or disable a control it knows will be denied, based on the permission set it last received. This is a courtesy only. The Rust command layer MUST re-check every command against the PermissionManager before performing it. A disabled button is not a security boundary.

The permission check happens inside the Rust command handler, after argument validation and before the ServiceAPI call. If the PermissionManager denies, the command returns the `permission_denied` error envelope ([[Contracts-Part05]]) and performs no side effect. The corresponding `Eulinx://permission/denied` event MAY be emitted for audit and UX, but it is not required for the command to fail.

Destructive commands — `push` to git, `delete` file, `publish` to an external service, `terminate` a Worker, `merge` an Artifact into the workspace — MUST additionally honor human-in-the-loop approval gates. The command layer checks both the permission grant and the pending approval before acting. See [[PermissionManager-Part01]] for the capability list.

# Secrets and Handles

The IPC boundary MUST NOT leak secrets. Provider API keys, the OS secure-store handle, and any credential blob stay inside the Rust layer. A command result MUST NEVER include a raw key, a token, or a connection string. The Rust layer reads a secret only at the moment it makes an outbound provider call and discards it from memory afterward.

The IPC boundary MUST NOT leak handles. No command returns a file descriptor, a `DirectoryHandle`, a SQLite connection, a process id that can be signaled, or a PTY master. Terminal output travels as streamed event chunks; terminal control travels as commands (`resize_terminal`, `write_terminal`). See [[PluginSDK-Part01]] for the broader no-handle rule, which applies to every boundary in Eulinx.

# Error-Handling Contract

The error-handling contract on IPC is:

- A command returns exactly one of: a success result, or the `ApiError` envelope. Nothing else.
- The envelope `code` is stable and defined in [[Contracts-Part05]]. The UI branches on `code`, not on `message`.
- A `retryable` flag in `context` tells the UI whether a retry is safe. `lock_conflict` and `merge_conflict` are retryable; `permission_denied`, `workspace_scope_mismatch`, and `validation_error` are not.
- A `correlationId` in the response lets the UI match a command to the event(s) it will cause. The EventBus carries the same `correlationId` on downstream events (see [[EventBus-Part01]]).
- An unhandled Rust panic inside a command MUST be caught at the command boundary and converted to a generic `internal_error` envelope with a trace id, never surfaced as a raw stack trace to the UI.

# Input Validation

The Rust command layer validates every argument before dispatch:

- `workspaceId` present and matches the caller session.
- required fields present and of the correct JSON type.
- enum-typed fields match an allowed value (e.g., `RunState`, `RefinementMode`).
- size limits respected (no oversized payloads; large transfers by reference).
- path arguments confined to the workspace root unless an explicit capability grants broader access.

Validation failure returns `validation_error` with the offending field name in `context`. The command MUST NOT reach a runtime service if validation fails.

# AI Notes

Do not trust the UI's disabled state as a permission check. The Rust command re-checks. If you remove the server-side check "because the button is hidden", you have opened a privilege-escalation path.

Do not return a key or token in any response. If a command needs a secret, the Rust layer fetches it at call time from the secure store and uses it; the value never serializes.

Do not branch UI error handling on `message` text. Use the stable `code`. Messages are for humans; codes are for logic.

Do not make a destructive command succeed without checking the approval gate. Push, delete, publish, terminate, and merge are gated by both permission and human approval.

Do not let an event for the wrong workspace reach a handler. Filter at the subscription boundary by `workspaceId`; a stale listener is exactly how the runtime mirror gets corrupted.

# Related Documents

- [[15-api/README]]
- [[IPC-Part01]]
- [[IPC-Part02]]
- [[IPC-Part03]]
- [[Contracts-Part05]]
- [[PermissionManager-Part01]]
- [[PluginSDK-Part01]]
- [[EventBus-Part01]]
- [[07-ui-ux/README]]
