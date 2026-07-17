---
title: EventAPI Specification - Part 02
status: draft
version: 1.0
tags:
  - api
  - event-api
  - catalog
  - families
related:
  - "[[15-api/README]]"
  - "[[EventAPI-Part01]]"
  - "[[EventAPI-Part03]]"
  - "[[EventAPI-Part04]]"
  - "[[EventAPI-Part05]]"
  - "[[Contracts-Part02]]"
  - "[[02-runtime/README]]"
---

# EventAPI Specification (Part 02)

## Document Index

Part 01 - Catalog purpose, the facts-not-commands rule, and the naming scheme
Part 02 - The typed event families by domain
Part 03 - The event payload contract and required fields
Part 04 - Deliverability classes and the plugin queue
Part 05 - The event lifecycle, emission rules, and consistency with Contracts

# Purpose

This part enumerates the event families of the Eulinx catalog. The exhaustive, canonical name list lives in [[Contracts-Part02]]; here the families are grouped by domain and described so a model knows what kinds of facts exist and which service emits them. Every name below is past tense and belongs on the `listen` channel only.

# Worker Family (`Eulinx://worker/...`)

Emitted by WorkerSpawner and the Worker state machine ([[03-worker-system/README]]).

- `Eulinx://worker/spawned` — a Worker process was created.
- `Eulinx://worker/state_changed` — a Worker changed RunState (idle, planning, working, waiting, blocked, reviewing, testing, completed, etc.).
- `Eulinx://worker/output_streamed` — a chunk of terminal output (high-frequency, coalesced).
- `Eulinx://worker/process_exited` — the underlying PTY process exited.
- `Eulinx://worker/terminated` — a Worker was stopped by command.
- `Eulinx://worker/refinement_progress` — a refinement pass counter advanced.

# Task Family (`Eulinx://task/...`)

Emitted by ExecutionEngine and the Scheduler ([[ExecutionEngine-Part01]], [[Scheduler-Part01]]).

- `Eulinx://task/created`
- `Eulinx://task/assigned`
- `Eulinx://task/status_changed`
- `Eulinx://task/completed`
- `Eulinx://task/failed`

# Artifact Family (`Eulinx://artifact/...`)

Emitted by ArtifactManager and the Verifier ([[ArtifactManager-Part01]], [[05-artifacts/README]]).

- `Eulinx://artifact/created`
- `Eulinx://artifact/versioned`
- `Eulinx://artifact/verified`
- `Eulinx://artifact/merged`
- `Eulinx://artifact/rejected`

# Execution Family (`Eulinx://execution/...`)

Emitted by ExecutionEngine ([[ExecutionEngine-Part01]]).

- `Eulinx://execution/started`
- `Eulinx://execution/progress_reported` (high-frequency, coalesced by executionId)
- `Eulinx://execution/completed`
- `Eulinx://execution/failed`

# Lock Family (`Eulinx://lock/...`)

Emitted by LockManager ([[LockManager-Part01]]).

- `Eulinx://lock/granted`
- `Eulinx://lock/denied`
- `Eulinx://lock/released`
- `Eulinx://lock/conflict_detected`

# Merge Family (`Eulinx://merge/...`)

Emitted by MergeManager ([[MergeManager-Part01]]).

- `Eulinx://merge/conflict_detected`
- `Eulinx://merge/auto_merged`
- `Eulinx://merge/manual_merge_required`
- `Eulinx://merge/applied`

# Memory Family (`Eulinx://memory/...`)

Emitted by MemoryManager and ContextManager ([[MemoryManager-Part01]], [[ContextManager-Part01]]).

- `Eulinx://memory/injected`
- `Eulinx://memory/channel_posted`
- `Eulinx://memory/summarized`

# Workflow Family (`Eulinx://workflow/...`)

Emitted by the Workflow engine and the runtime graph mutator ([[06-workflow-engine/README]]).

- `Eulinx://workflow/node_added`
- `Eulinx://workflow/node_removed`
- `Eulinx://workflow/edge_added`
- `Eulinx://workflow/graph_mutated` (a Worker spawned a sub-Worker, growing the graph)
- `Eulinx://workflow/run_started`
- `Eulinx://workflow/run_completed`

# Session Family (`Eulinx://session/...`)

Emitted by Session and terminal management ([[07-ui-ux/README]], TerminalView).

- `Eulinx://session/opened`
- `Eulinx://session/closed`
- `Eulinx://session/terminal_attached`

# Permission Family (`Eulinx://permission/...`)

Emitted by PermissionManager ([[PermissionManager-Part01]]).

- `Eulinx://permission/denied`
- `Eulinx://permission/granted`
- `Eulinx://permission/approval_required`

# Plugin Family (`Eulinx://plugin/...`)

Emitted by the plugin host and broker ([[09-plugin-system/README]], [[PluginAPI-Part01]]).

- `Eulinx://plugin/installed`
- `Eulinx://plugin/enabled`
- `Eulinx://plugin/disabled`
- `Eulinx://plugin/quarantined`

# EventBus Family (`Eulinx://eventbus/...`)

Emitted by the EventBus itself ([[EventBus-Part01]]).

- `Eulinx://eventbus/subscriber_dropped_event`
- `Eulinx://eventbus/log_write_failed`
- `Eulinx://eventbus/service_health_changed`

# Runtime Family (`Eulinx://runtime/...`)

Emitted by RuntimeManager ([[02-runtime/README]]).

- `Eulinx://runtime/ready`
- `Eulinx://runtime/degraded`
- `Eulinx://runtime/failed`
- `Eulinx://runtime/invariant_violated`

# AI Notes

Do not emit a `Eulinx://` name that is not in this list or [[Contracts-Part02]]. The catalog is closed; add to Contracts first.

Do not use a present-tense name in any family. `Eulinx://worker/spawn` is wrong; the fact is `spawned`.

Do not put a high-frequency stream in a replay-grade event. `output_streamed` and `progress_reported` are explicitly coalesced; tag them correctly so Replay stays small.

Do not assume cross-family ordering. Sequence numbers are per-source; a Worker event and a Task event are not globally ordered.

# Related Documents

- [[15-api/README]]
- [[EventAPI-Part01]]
- [[EventAPI-Part03]]
- [[EventAPI-Part04]]
- [[EventAPI-Part05]]
- [[Contracts-Part02]]
- [[EventBus-Part01]]
- [[02-runtime/README]]
- [[03-worker-system/README]]
