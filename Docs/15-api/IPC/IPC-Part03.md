---
title: IPC Specification - Part 03
status: draft
version: 1.0
tags:
  - api
  - ipc
  - listeners
  - backpressure
related:
  - "[[15-api/README]]"
  - "[[IPC-Part01]]"
  - "[[IPC-Part02]]"
  - "[[IPC-Part04]]"
  - "[[EventBus-Diagrams]]"
  - "[[TerminalView-Part03]]"
---

# IPC Specification (Part 03)

## Document Index

Part 01 - The two channels, direction rules, serialization, and the error envelope
Part 02 - Command naming, event naming (`Eulinx://`), and the channel dispatch table
Part 03 - Listener lifecycle, batching, throttling, and backpressure
Part 04 - Security, workspace scope, and the error-handling contract

# Purpose

This part specifies the lifecycle and delivery mechanics of the `listen` side of IPC: how a listener is opened, how events are batched and throttled before they reach React, and how a listener is closed. The `invoke` side is request/response and needs no lifecycle beyond the call; the event side is a long-lived subscription and is where most correctness bugs live.

# Listener Lifecycle

A listener is opened by calling `listen("Eulinx://...", handler)` from a React effect. The handler receives an event object whose `payload` is the typed data defined in [[Contracts-Part02]]. The `listen` call returns an `unlisten` function.

The listener lifecycle contract is mandatory and non-optional:

- Every `listen` MUST be paired with its `unlisten` in the same effect's cleanup.
- A listener MUST NOT outlive the component or hook that opened it.
- A listener MUST NOT be re-opened on every render; it is opened once per mount.
- On a workspace switch, every listener registered for the previous workspace MUST be unlistened before the new workspace's listeners are opened.

A leaked listener is not a memory nit. In Eulinx it double-applies events after a workspace switch and silently corrupts the runtime mirror, because the same `Eulinx://worker/state_changed` arrives twice and the second application may run against the wrong workspace's store slice. This is the single most common defect class in the project and [[07-ui-ux/README]] calls it out explicitly.

The FrontendAPI provides a subscription manager that binds listeners to a workspace scope and tears them all down on switch, so components SHOULD use it rather than calling `listen` directly (see [[FrontendAPI-Part04]]).

# Batching and Throttling

High-frequency events are not delivered to React one at a time. The Rust EventBus UI Batcher collects them into a batch and emits the batch on a single Tauri event named `Eulinx://events`. The React side receives the batch, dispatches a single reducer action, and performs one render.

The batching rules (replicated from [[EventBus-Diagrams]] for the IPC boundary) are:

- Coalesce `Eulinx://worker/output_streamed` by `(type, workerId, channel)`: append chunk strings, cap at 64 KiB, set `truncatedBytes` when capped.
- Coalesce `Eulinx://execution/progress_reported` by `executionId`: replace, newest wins.
- Flush the open batch when: 50 ms have elapsed, OR 200 events are buffered, OR a replay-grade (merge/permission/lock) event arrives (immediate flush, no wait).

This means a busy terminal produces one render per 50 ms of output, not one render per chunk. The UI stays responsive even when a Worker floods output. The same backpressure responsibility exists on the frontend: TerminalView MUST cap its scrollback and must not block the main thread (see [[TerminalView-Part03]]).

# Delivery Classes on the UI Transport

The EventBus exposes three delivery classes (see [[EventBus-Part01]]). On the IPC boundary they map as:

- **core** events — replay-grade facts (`Eulinx://worker/spawned`, `Eulinx://artifact/merged`, `Eulinx://lock/granted`). Never dropped, never coalesced away (only progress-style ones coalesce). Guaranteed delivery.
- **ui** events — high-frequency streams and progress. May be coalesced; on UI-queue overflow, non-replay-grade events may be dropped, and `droppedSinceLastBatch` is reported so the UI can show a "stream truncated" state.
- **plugin** events — events delivered to plugin subscribers live on a separate lossy queue and never touch core delivery. A slow plugin never stalls the UI.

The IPC layer MUST distinguish these so the UI knows which events are authoritative (core) and which are best-effort (ui/plugin). The runtime mirror is updated only from authoritative events; a dropped stream chunk updates a transient terminal buffer, not trusted state.

# Late, Duplicate, and Out-of-Order Events

The UI MUST assume any event can arrive late, twice, or out of order relative to user expectation, because network batching, workspace switch races, and replay can all produce this. Every handler MUST be idempotent:

- Applying `Eulinx://worker/state_changed` with the same `sequence` twice MUST be a no-op.
- Applying an event for a `workerId` that no longer exists in the current workspace MUST be ignored, not stored.
- Applying an event whose `workspaceId` does not match the active workspace MUST be dropped at the subscription boundary.

# AI Notes

Do not call `listen` directly inside a component without a matching `unlisten` in cleanup. Use the FrontendAPI subscription manager so the workspace switch tear-down is automatic.

Do not update the runtime mirror from a coalesced stream event. Stream output is ephemeral terminal content; only core events mutate the trusted state in the Zustand runtime slice.

Do not assume event order equals user-visible order. Sequence numbers are per-source; cross-source ordering is not guaranteed and the UI MUST NOT depend on it.

Do not render an optimistic state from an `invoke` that has not resolved. Render "request pending"; render the real state only when the confirming event arrives. Optimistic Worker state is a lie the user will believe.

# Related Documents

- [[15-api/README]]
- [[IPC-Part01]]
- [[IPC-Part02]]
- [[IPC-Part04]]
- [[FrontendAPI-Part04]]
- [[EventBus-Part01]]
- [[EventBus-Diagrams]]
- [[07-ui-ux/README]]
- [[TerminalView-Part03]]
