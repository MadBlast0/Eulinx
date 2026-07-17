---
title: Contracts Specification - Part 04
status: draft
version: 1.0
tags:
  - api
  - contracts
  - shared-types
  - envelope
related:
  - "[[15-api/README]]"
  - "[[Contracts-Part01]]"
  - "[[Contracts-Part02]]"
  - "[[Contracts-Part03]]"
  - "[[Contracts-Part05]]"
  - "[[IPC-Part01]]"
  - "[[EventAPI-Part03]]"
---

# Contracts Specification (Part 04)

## Document Index

Part 01 - The command name registry (invoke commands)
Part 02 - The event name registry (Eulinx:// events)
Part 03 - Request and response shapes per command
Part 04 - Shared field and envelope types
Part 05 - The error code registry
Part 06 - API versioning and the change log

# Purpose

This part defines the shared types used across requests, responses, and event payloads: the `ApiError` envelope, the event envelope fields, and the common enums/value objects. Defining them once here prevents drift between the Rust structs ([[RustAPI-Part02]]), the TS types ([[FrontendAPI-Part01]]), and the event payloads ([[EventAPI-Part03]]).

# The ApiError Envelope

The uniform error returned by every command failure ([[IPC-Part01]]). Fields:

- `code` — stable string from [[Contracts-Part05]]. The only field the UI branches on.
- `message` — human-readable sentence.
- `context?` — object with any of: `retryable` (bool), `field` (offending arg name), `offending_id` (resource id), `owner` (current lock owner), `trace_id` (for internal errors), `scope` (workspace id).

The envelope is serialized identically on the wire (Tauri rejection) and internally (Rust `ApiError`, TS `ApiError`). The `code` set is closed and defined in [[Contracts-Part05]].

# The Event Envelope

Every event carries these fields (see [[EventAPI-Part03]] and `EulinxEvent` in [[EventBus-Part01]]):

- `event_id` — unique id, used for idempotent handling.
- `sequence` — monotonic per source, never repeats or reverses.
- `type` — the `Eulinx://` name from [[Contracts-Part02]].
- `payload` — event-specific data (plain JSON).
- `source` — publishing service and instance.
- `workspace_id` — scope; required.
- `session_id?`, `execution_id?` — optional context.
- `correlation_id?` — links to the causing command.
- `causation_id?` — links to the causing event.
- `replay_grade` — bool; true means logged before delivery, never dropped.
- `emitted_at` — ISO timestamp.

# Common Enums

`RunState` (Worker lifecycle states): `created`, `initializing`, `idle`, `planning`, `working`, `waiting`, `blocked`, `reviewing`, `testing`, `coding`, `researching`, `completed`, `archived`, `destroyed`, `unknown`. The UI renders `unknown` honestly when a state is missing ([[FrontendAPI-Part05]]).

`RefinementMode`: `low`, `medium`, `high`, `ultra`. Low = one draft pass; Ultra = up to eight refine passes with a stronger critic (see the refinement loop in [[10-ai-system/README]]).

`TaskStatus`: `created`, `queued`, `assigned`, `executing`, `reviewing`, `verified`, `completed`, `failed`.

`LockScope`: `file`, `symbol`.

`Verifier`: `build`, `lint`, `test`, `typecheck`, `judge` (the judge is heuristic, labeled "suggested").

`Health`: `unknown`, `healthy`, `unhealthy`.

`SettingScope`: `workspace`, `global`.

`SessionKind`: `chat`, `terminal`, `agent`.

# Common Value Objects

`WorkerSummary`: defined in [[Contracts-Part03]] (Worker shapes).

`ArtifactRef`: an opaque reference to stored Artifact content; carries `artifact_id` and `kind`. It is NOT a file handle.

`GraphNode`: `id`, `kind` (enum: `worker`, `tool`, `logic`, `artifact`, `memory`, `human_approval`, `delay`, `git`, `mcp`), `label`, `position?` (manual), `status?`.

`GraphEdge`: `id`, `from` (node id), `to` (node id), `kind` (enum: `data`, `control`).

`Unit`: the empty success value (no payload) returned by commands with no result.

`Finding`: `severity` (enum: `error`, `warning`, `info`), `message`, `location?`.

# AI Notes

Do not add an error `code` outside [[Contracts-Part05]]. The set is closed; add it there, then use it.

Do not put a handle where a value object says "reference". `ArtifactRef` is an id, not a file descriptor.

Do not render a missing `RunState` as `idle`. Render `unknown`; guessing is the cardinal UI sin ([[FrontendAPI-Part05]]).

Do not let an enum grow unnamed values. If a new state appears, add it to Contracts and to the Rust/TS enum together.

# Related Documents

- [[15-api/README]]
- [[Contracts-Part01]]
- [[Contracts-Part02]]
- [[Contracts-Part03]]
- [[Contracts-Part05]]
- [[IPC-Part01]]
- [[EventAPI-Part03]]
- [[EventBus-Part01]]
- [[FrontendAPI-Part01]]
- [[RustAPI-Part02]]
