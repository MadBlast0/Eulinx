---
title: RustAPI Specification - Part 04
status: draft
version: 1.0
tags:
  - api
  - rust-api
  - native
  - os
related:
  - "[[15-api/README]]"
  - "[[RustAPI-Part01]]"
  - "[[RustAPI-Part02]]"
  - "[[RustAPI-Part03]]"
  - "[[ServiceAPI-Part01]]"
  - "[[03-worker-system/README]]"
---

# RustAPI Specification (Part 04)

## Document Index

Part 01 - The Tauri command-handler surface, the thin-backend rule, and dispatch
Part 02 - Argument and return shapes, the async/sync split, and streaming commands
Part 03 - Dispatch to ServiceAPI, the PermissionManager check, and error mapping
Part 04 - The native OS surface: filesystem, PTY, window, secure store

# Purpose

This part specifies the native OS surface that justifies Rust's existence in Eulinx: the operations that must touch the operating system and that the cheap coding model should never have to write. These are the only Rust responsibilities per the thin-backend rule ([[RustAPI-Part01]]). Each is exposed to the rest of the system through a Rust utility module, called by command handlers or by runtime services, never directly by the frontend.

# Filesystem

The filesystem utility provides scoped read/write/list/watch over the workspace root. It:

- resolves a workspace-relative path against the workspace root and rejects escape attempts (`../` traversal outside root) unless a capability grants broader access
- streams large reads rather than loading them whole (see [[RustAPI-Part02]] streaming)
- watches the project folder via the `notify` crate and reports changes as events for the file-watcher feature
- never returns a file descriptor to the frontend or a plugin; it returns content or an Artifact reference

The utility is the only place that holds `std::fs` handles, and those handles never cross a boundary.

# PTY / Terminal Management

The PTY utility manages terminal processes: spawn a shell (or a CLI such as an AI coding agent), wire its master/slave, capture output, forward input, and report resize. It is the backend half of TerminalView ([[TerminalView-Part01]]).

The utility:

- spawns the process under tokio and bridges its stdout/stderr to the EventBus as `Eulinx://worker/output_streamed` chunks
- forwards frontend input from `write_terminal` to the PTY master
- propagates resize from `resize_terminal` to the PTY
- reports process exit as `Eulinx://worker/process_exited`
- manages scrollback buffering on the backend side up to a cap, offloading the rest to the Artifact store
- never exposes the PTY master fd across IPC; control is by command, output is by event

This is why terminals are real: the Rust PTY is the engine, xterm.js is the projection ([[07-ui-ux/README]], [[TerminalView-Part01]]).

# Window Management

The window utility wraps Tauri's window APIs for minimize, maximize, close, set title, set theme, and multi-window handling. It is driven by `windowService` commands. It does not contain layout logic — WorkspaceLayout ([[WorkspaceLayout-Part01]]) owns the region model; the window utility only applies OS-level operations.

# OS Secure Store

The secure-store utility wraps the platform credential store (keychain/secret-service). It is the only place provider API keys live. It:

- stores a key by provider id, scoped to the user, never to a workspace file
- retrieves a key only at the moment a runtime service makes an outbound provider call, and discards it from memory afterward
- never returns a key over IPC or to a plugin
- supports deletion and rotation

The frontend's `providerService` manages provider metadata (name, model list, enabled) but never the secret itself. See [[IPC-Part04]] for the no-secret rule.

# Native Dialogs

The native-dialog utility wraps OS file pickers, folder pickers, and confirmation dialogs. It is used for first-run workspace selection and for human-in-the-loop destructive confirmations. The dialog result returns as a command result; the confirmation state is what later satisfies the approval gate in [[RustAPI-Part03]].

# AI Notes

Do not add business logic to a native utility. These modules do OS work only; scheduling, merging, and AI live in services. A utility that "decides" is a leak of the thin-backend rule.

Do not return a file descriptor or PTY master across IPC. Control by command, output by event; the handle stays in Rust.

Do not read a provider key into frontend memory. The secure store yields it only at outbound-call time and forgets it.

Do not let a filesystem path escape the workspace root. Resolve and reject traversal; a path bug here is a sandbox escape.

# Related Documents

- [[15-api/README]]
- [[RustAPI-Part01]]
- [[RustAPI-Part02]]
- [[RustAPI-Part03]]
- [[ServiceAPI-Part01]]
- [[07-ui-ux/README]]
- [[TerminalView-Part01]]
- [[WorkspaceLayout-Part01]]
- [[IPC-Part04]]
- [[PermissionManager-Part01]]
- [[03-worker-system/README]]
