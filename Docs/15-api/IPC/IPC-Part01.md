---
title: IPC Specification - Part 01
status: draft
version: 1.0
tags:
  - api
  - ipc
  - tauri
  - channels
related:
  - "[[15-api/README]]"
  - "[[IPC-Part02]]"
  - "[[IPC-Part03]]"
  - "[[Contracts-Part01]]"
  - "[[07-ui-ux/README]]"
  - "[[EventAPI-Part01]]"
---

# IPC Specification (Part 01)

## Document Index

Part 01 - The two channels, direction rules, serialization, and the error envelope
Part 02 - Command naming, event naming (`Eulinx://`), and the channel dispatch table
Part 03 - Listener lifecycle, batching, throttling, and backpressure
Part 04 - Security, workspace scope, and the error-handling contract

# Purpose

IPC is the contract that governs the single boundary between the React frontend and the Rust runtime. Eulinx's frontend has exactly two ways to reach the Runtime, and the direction of each is fixed and non-negotiable:

- `invoke` carries a **command** from the UI to the Runtime. It is request/response: the UI sends arguments, the Runtime returns a result or an error. One call, one answer.
- `listen` carries an **event** from the Runtime to the UI. It is fire-and-forget, one-way: the Runtime broadcasts a fact, the UI reacts. There is no response and no acknowledgement.

There is no third channel. The UI MUST NOT open a WebSocket, MUST NOT read files from disk, MUST NOT call a provider API directly, and MUST NOT poll state that an event already reports. Everything the UI knows, it learned over one of these two channels. This is the governing rule of [[07-ui-ux/README]] (The Two Channels) and it is restated here as the foundation of the API.

# The Two Channels

The `invoke` channel is typed `command(args) -> result`. It is the only path by which the UI requests a state change. Examples of what belongs here: spawn a Worker, merge an Artifact, request a lock, save a setting, run a verification. The UI never mutates trusted state by any other means; it asks, and the Runtime decides.

The `listen` channel is typed `event -> void`. It is the only path by which the Runtime informs the UI that something already happened. Examples: `worker.spawned`, `artifact.verified`, `execution.progress_reported`. The UI treats every event as the authority over its local mirror of runtime state.

These two channels are deliberately asymmetric. The UI can ask; it cannot tell. The Runtime can report; it cannot be commanded by an event. This asymmetry is what keeps the backend as the single source of truth and is why the EventBus is forbidden from becoming a control channel (see [[EventBus-Part01]] and [[EventAPI-Part01]]).

# Serialization

Every payload on both channels is serialized as JSON. The Rust side uses Serde; the TypeScript side uses the built-in `JSON` object. The wire format is UTF-8 text with `Content-Type` semantics supplied by Tauri's IPC transport (the body is already structured). No other encoding (MsgPack, CBOR, protobuf) is used on the UI boundary.

A payload MUST be plain, structured data: objects, arrays, strings, numbers, booleans, and null. It MUST NOT contain:

- a live Rust object, `Arc`, `Mutex`, or any smart pointer
- a file descriptor, socket, process handle, or database connection
- a function, closure, or class instance
- a cyclic reference that cannot be represented as JSON

The EventBus already enforces payload immutability after publication ([[EventBus-Part01]]). On the IPC boundary, the same rule holds: the UI receives a copy; mutating it does not change the Runtime. Conversely, the Runtime never receives a reference the UI can later mutate.

# The Error Envelope

Every `invoke` that fails returns a structured error envelope, never a raw string and never an unwrapped Rust panic. The envelope has three required fields:

- `code` — a stable, machine-readable string such as `worker_not_found`, `permission_denied`, `lock_conflict`, `artifact_verify_failed`, `workspace_scope_mismatch`. Codes are defined in [[Contracts-Part05]].
- `message` — a human-readable sentence describing what went wrong, suitable for a toast or a log line.
- `context` — an optional object carrying additional detail: the offending id, the conflicting owner, the retryable flag, or the validation field name. It is free-form but SHOULD be consistent for a given `code`.

On the TypeScript side, the error envelope is delivered through Tauri's rejection path; the FrontendAPI layer normalizes it into a typed `ApiError` so every caller handles failures the same way (see [[FrontendAPI-Part03]]). On the Rust side, a command returns `Result<T, ApiError>`; the command layer serializes the `Err` variant into the envelope.

The envelope MUST distinguish retryable from non-retryable failures. A `lock_conflict` is expected and retryable; a `permission_denied` is final and MUST NOT be retried by the caller. A `workspace_scope_mismatch` is a programming error and indicates a client bug.

# Payload Size Limits

Commands and events share the EventBus payload ceiling philosophy. A single command argument bundle or event payload SHOULD stay under a conservative size budget (the EventBus enforces 256 KiB on replay-grade events — see [[EventBus-Diagrams]]). Large transfers (file contents, full Artifact bodies) MUST NOT ride inside an event or a command result. They are referenced by id and fetched through a dedicated streaming command or stored Artifact handle. This keeps the two channels light and the UI responsive.

# Invariants

The IPC layer MUST enforce:

```text
Every invoke has exactly one response: a result or an error envelope.
Every listen is one-way; no acknowledgement is sent back.
No command reaches the Runtime without a workspaceId scope.
No event crosses a Workspace boundary without an explicit scope.
No payload carries a handle, live object, or non-JSON value.
No event name is present tense; events are facts.
No UI component opens its own transport; invoke/listen only.
```

# AI Notes

Do not add a third transport because it "feels easier." Polling a backend over a socket duplicates the EventBus and creates two sources of truth. If the UI seems to need a missing event, add the event to [[EventAPI-Part01]], do not open a socket.

Do not return a provider API key, a secure-store secret, or a file path outside the workspace in any command result. The Rust layer reads secrets only at the moment of an outbound call and never serializes them.

Do not throw a raw Rust error across the boundary. Wrap it in the `ApiError` envelope with a stable `code` so the UI can branch on the code, not on a string match.

Do not assume the UI enforces permissions. The UI MAY hide a control it knows will be denied, but the Rust command MUST re-check with the PermissionManager. A disabled button is a courtesy, never a control.

# Related Documents

- [[15-api/README]]
- [[IPC-Part02]]
- [[IPC-Part03]]
- [[IPC-Part04]]
- [[Contracts-Part01]]
- [[FrontendAPI-Part01]]
- [[RustAPI-Part01]]
- [[EventAPI-Part01]]
- [[07-ui-ux/README]]
- [[EventBus-Part01]]
