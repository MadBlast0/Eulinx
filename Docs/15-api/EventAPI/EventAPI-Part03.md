---
title: EventAPI Specification - Part 03
status: draft
version: 1.0
tags:
  - api
  - event-api
  - payload
  - contract
related:
  - "[[15-api/README]]"
  - "[[EventAPI-Part01]]"
  - "[[EventAPI-Part02]]"
  - "[[EventAPI-Part04]]"
  - "[[EventAPI-Part05]]"
  - "[[EventBus-Part01]]"
  - "[[Contracts-Part02]]"
  - "[[Contracts-Part04]]"
---

# EventAPI Specification (Part 03)

## Document Index

Part 01 - Catalog purpose, the facts-not-commands rule, and the naming scheme
Part 02 - The typed event families by domain
Part 03 - The event payload contract and required fields
Part 04 - Deliverability classes and the plugin queue
Part 05 - The event lifecycle, emission rules, and consistency with Contracts

# Purpose

This part specifies the payload contract shared by every event. The payload is the data carried after the `Eulinx://` name. It is plain, serializable JSON, and its shape per event is canonical in [[Contracts-Part02]] (event payloads) and [[Contracts-Part04]] (shared field definitions). The EventBus payload rules in [[EventBus-Part01]] govern; this part states them in API terms.

# Required Envelope Fields

Every event, regardless of family, carries the same envelope fields (defined on `EulinxEvent` in [[EventBus-Part01]]):

- `event_id` — a unique id for the event; used for idempotent handling on the frontend ([[FrontendAPI-Part04]]).
- `sequence` — a monotonic, per-source sequence number; never repeats, never goes backward.
- `type` — the `Eulinx://` event name.
- `payload` — the event-specific data (see below).
- `source` — the runtime service and instance that published.
- `workspace_id` — the workspace the fact belongs to; used for scope filtering ([[IPC-Part03]], [[IPC-Part04]]).
- `session_id?` — optional, the session if relevant.
- `execution_id?` — optional, the execution if relevant.
- `correlation_id?` — optional, links the event to the command that caused it ([[RustAPI-Part02]], [[FrontendAPI-Part03]]).
- `causation_id?` — optional, the event that directly caused this one.
- `replay_grade` — boolean; true if the event MUST be durably logged before delivery (see [[EventAPI-Part04]]).
- `emitted_at` — an ISO timestamp.

# Payload Field Rules

The `payload` object is specific to each event name and is defined in [[Contracts-Part02]]. The rules that apply to every payload:

- A payload MUST be plain data: objects, arrays, strings, numbers, booleans, null. No handles, no live objects, no functions (the EventBus forbids this, [[EventBus-Part01]]).
- A payload field MUST NOT carry a file descriptor, process handle, connection, or secret. Large content travels by Artifact reference, not inline.
- A payload SHOULD carry enough signal to avoid noise: e.g., `Eulinx://worker/state_changed` carries `worker_id`, `state`, `progress?`, and `task_id?` so a Worker gets context without dumping transcripts ([[01-core-concepts/README]] memory bus principle).
- A payload MUST be immutable after publication. The EventBus rejects mutation across subscribers ([[EventBus-Part01]]).
- A payload over the size ceiling (256 KiB for replay-grade, aligned with the EventBus, [[EventBus-Diagrams]]) MUST be rejected or truncated with `truncated_bytes` reported.

# Selective Injection Principle in Events

Events are how the "by the way" memory bus works ([[01-core-concepts/README]], [[MemoryManager-Part01]]). An event carries metadata-rich summaries, not full transcripts, so observers get signal without noise. For example, `Eulinx://memory/channel_posted` carries the channel, a summary, and a progress percentage, not the entire conversation. This is deliberate: it prevents context blow-up and keeps the broadcast cheap.

# Correlation and Causation

The `correlation_id` lets the frontend match a command's effects to the command that caused them. The `causation_id` lets the EventBus and Replay reconstruct why an event happened. Both are optional but SHOULD be set when an event is the direct result of a command or another event, because Replay depends on the causal chain ([[EventBus-Part05]]).

# AI Notes

Do not put a handle or secret in a payload. Return an id or an Artifact reference; the no-handle rule is total.

Do not dump full transcripts into events. Carry summaries and metadata; full content lives in memory/Artifacts, fetched on demand.

Do not mutate a payload after publish. Treat it as immutable; the bus enforces this and a mutation would corrupt other subscribers.

Do not omit `workspace_id`. Scope filtering depends on it; an event without it cannot be routed or filtered safely.

Do not set `replay_grade` carelessly. A replay-grade event is logged before delivery and never dropped; marking a high-frequency stream replay-grade would balloon the log.

# Related Documents

- [[15-api/README]]
- [[EventAPI-Part01]]
- [[EventAPI-Part02]]
- [[EventAPI-Part04]]
- [[EventAPI-Part05]]
- [[EventBus-Part01]]
- [[EventBus-Diagrams]]
- [[Contracts-Part02]]
- [[Contracts-Part04]]
- [[FrontendAPI-Part04]]
- [[IPC-Part03]]
