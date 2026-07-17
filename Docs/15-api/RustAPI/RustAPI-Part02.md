---
title: RustAPI Specification - Part 02
status: draft
version: 1.0
tags:
  - api
  - rust-api
  - serialization
  - async
related:
  - "[[15-api/README]]"
  - "[[RustAPI-Part01]]"
  - "[[RustAPI-Part03]]"
  - "[[Contracts-Part03]]"
  - "[[Contracts-Part05]]"
---

# RustAPI Specification (Part 02)

## Document Index

Part 01 - The Tauri command-handler surface, the thin-backend rule, and dispatch
Part 02 - Argument and return shapes, the async/sync split, and streaming commands
Part 03 - Dispatch to ServiceAPI, the PermissionManager check, and error mapping
Part 04 - The native OS surface: filesystem, PTY, window, secure store

# Purpose

This part specifies the shapes that cross the Rust command boundary: the argument structs, the return envelopes, the async/sync classification, and how streaming commands (terminal output, file reads) are handled without violating the payload-size rule from [[IPC-Part01]].

# Argument Shapes

Every command argument is a Rust struct derived with Serde `Deserialize`, with field names in snake_case matching the contract in [[Contracts-Part03]]. Required fields are non-optional; optional fields use `Option`. Enum fields use a Rust enum with `#[serde(rename_all = "snake_case")]` so the wire value matches the contract's allowed values (e.g., `RunState`, `RefinementMode`).

The argument struct MUST include `workspace_id` unless the command is explicitly global (window or app-level). Path arguments MUST be validated as confined to the workspace root unless a capability grants broader access ([[IPC-Part04]]).

# Return Shapes

A successful command returns the struct defined in [[Contracts-Part03]] for that command, serialized to JSON by Tauri. A failed command returns the `ApiError` envelope ([[IPC-Part01]]), serialized as a Tauri rejection. The envelope is a Rust struct with `code: ApiErrorCode`, `message: String`, and `context: Option<serde_json::Value>`.

The `ApiErrorCode` enum is the Rust source of truth for [[Contracts-Part05]]. Every variant maps to a stable snake_case string. Adding a variant is a breaking change recorded in [[Contracts-Part06]].

# The Async/Sync Split

Tauri commands may be async or sync. The rule:

- Commands that call a runtime service (which is async, over tokio) are `async fn`.
- Commands that perform a quick native OS call with an offloaded utility may be sync, but SHOULD be async if the call can block (file IO, PTY spawn).
- Commands MUST NOT hold a runtime lock across an `.await` point. The EventBus forbids publishing from inside a LockManager lock ([[EventBus-Part01]]); the same caution applies to command handlers holding service locks across await.

# Streaming Commands

High-volume data (terminal output, large file reads) MUST NOT be returned in a single command response. Instead:

- terminal output is pushed as `Eulinx://worker/output_streamed` events, coalesced on the UI batcher ([[IPC-Part03]])
- large file reads return a reference (an Artifact id or a scoped handle token that is NOT a file descriptor) and the content is fetched through a chunked command or streamed via events
- writes accept a reference the backend already holds, not a megabyte pasted into the command args

This keeps the `invoke` request/response path small and the UI responsive. The 256 KiB payload ceiling from the EventBus philosophy ([[EventBus-Diagrams]]) is the guide for what counts as "large".

# Idempotency and Correlation

A command accepts an optional `correlation_id`. The RustAPI passes it to the service, which stamps downstream EventBus events with the same `correlation_id` ([[EventBus-Part01]]) so the frontend can match a command to the events it causes. The command itself is not idempotent — repeated `spawn_worker` calls spawn repeated Workers — but the resulting events are deduplicated by `event_id` on the frontend ([[FrontendAPI-Part04]]).

# AI Notes

Do not put a file descriptor or a process handle in a return struct. Return an id or a reference token. The no-handle rule is total.

Do not return a megabyte in a command result. Stream it or reference it. Large payloads on the `invoke` path stall the UI and break the batching model.

Do not hold a LockManager lock across `.await`. Publish or call services after releasing it, or you risk the bus/lock deadlock the EventBus warns about.

Do not make a sync command that can block. If it touches disk or a PTY, make it async and offload the native call.

# Related Documents

- [[15-api/README]]
- [[RustAPI-Part01]]
- [[RustAPI-Part03]]
- [[RustAPI-Part04]]
- [[IPC-Part01]]
- [[IPC-Part03]]
- [[Contracts-Part03]]
- [[Contracts-Part05]]
- [[EventBus-Part01]]
- [[EventBus-Diagrams]]
