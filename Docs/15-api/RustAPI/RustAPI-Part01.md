---
title: RustAPI Specification - Part 01
status: draft
version: 1.0
tags:
  - api
  - rust-api
  - tauri
  - commands
related:
  - "[[15-api/README]]"
  - "[[RustAPI-Part02]]"
  - "[[RustAPI-Part03]]"
  - "[[RustAPI-Part04]]"
  - "[[IPC-Part01]]"
  - "[[ServiceAPI-Part01]]"
  - "[[Contracts-Part01]]"
---

# RustAPI Specification (Part 01)

## Document Index

Part 01 - The Tauri command-handler surface, the thin-backend rule, and dispatch
Part 02 - Argument and return shapes, the async/sync split, and streaming commands
Part 03 - Dispatch to ServiceAPI, the PermissionManager check, and error mapping
Part 04 - The native OS surface: filesystem, PTY, window, secure store

# Purpose

RustAPI is the Rust-side command surface: the `#[tauri::command]` functions that Tauri exposes to the frontend over `invoke`. This is where a UI command lands. The RustAPI owns the contract on the backend side of IPC: it validates arguments, checks scope and permission, delegates to a runtime service, and returns a result or the `ApiError` envelope. It MUST NOT contain business logic.

# The Thin-Backend Rule

Eulinx's Rust layer is deliberately thin because the coding model is cheap (DeepSeek V4 Flash) and strongest in TypeScript. The rule, stated in [[07-ui-ux/README]] and the project's core stack decision, is:

- Rust owns native OS work only: filesystem, PTY/terminal management, window management, OS secure store, native dialogs, and small performance-critical utilities.
- Rust MUST NOT contain scheduling logic, merge logic, AI-calling logic, refinement loops, memory injection, or workflow execution. Those live in runtime services (ServiceAPI) or, increasingly, in TypeScript orchestration.
- A `#[tauri::command]` is a thin façade: validate → authorize → delegate → return.

This keeps the surface a cheap model can write reliably and keeps the bulk of the codebase in the language the model handles best.

# The Command Handlers

Each command handler is a Rust function annotated with `#[tauri::command]`, with an argument struct derived from the contract in [[Contracts-Part03]] and a return type of `Result<T, ApiError>` where `T` is the contract result. The handler:

- receives the deserialized args (Serde, JSON)
- reads the `workspaceId` from the app state or the args
- performs input validation (presence, types, enums, size)
- calls the PermissionManager (see [[RustAPI-Part03]])
- calls exactly one ServiceAPI entry point
- maps the service result or error into the contract result or `ApiError`
- returns

The handler MUST NOT spawn its own tokio task for business work beyond what the service already manages, and MUST NOT block the async runtime with native OS calls that should be offloaded (PTY spawn, file IO) — those go through the native utilities in [[RustAPI-Part04]].

# Dispatch Table

The RustAPI dispatch table is the backend mirror of the IPC dispatch table ([[IPC-Part02]]). Each command name maps to one handler and one ServiceAPI call:

```text
spawn_worker    -> cmd_spawn_worker    -> WorkerSpawner.spawn
terminate_worker-> cmd_terminate_worker-> WorkerSpawner.terminate
merge_artifact  -> cmd_merge_artifact  -> MergeManager.submit
request_lock    -> cmd_request_lock     -> LockManager.request
save_setting    -> cmd_save_setting     -> SettingStore.save
run_verification-> cmd_run_verification -> Verifier.run
```

The full name-to-handler map is the union of [[Contracts-Part01]] and this part. The handler names are internal; the wire names are the flat snake_case commands.

# Command vs Event Ownership

A command handler MUST NOT publish an event directly except through the service it calls. Events are published by runtime services on the EventBus ([[EventBus-Part01]]), not by command handlers, so that the event log and replay remain consistent. A handler that needs to report a fact does so by calling the service, which publishes.

# AI Notes

Do not write scheduling, merging, or AI logic inside a command. Delegate to a ServiceAPI call. The thin-backend rule exists because the coding model is cheap and Rust is the part it struggles with.

Do not publish events from a command handler. Let the service publish. Publishing from the handler bypasses the event log and breaks Replay ([[EventBus-Part05]]).

Do not block the async runtime with a synchronous native call. Use the offloaded native utilities ([[RustAPI-Part04]]) so the UI stays responsive.

Do not return a handle or a secret. The no-handle and no-secret rules from [[IPC-Part04]] apply on the Rust side too.

# Related Documents

- [[15-api/README]]
- [[RustAPI-Part02]]
- [[RustAPI-Part03]]
- [[RustAPI-Part04]]
- [[IPC-Part01]]
- [[IPC-Part02]]
- [[ServiceAPI-Part01]]
- [[Contracts-Part01]]
- [[07-ui-ux/README]]
- [[EventBus-Part01]]
