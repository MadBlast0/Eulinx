---
title: Contracts Specification - Part 02
status: draft
version: 1.0
tags:
  - api
  - contracts
  - events
  - registry
related:
  - "[[15-api/README]]"
  - "[[Contracts-Part01]]"
  - "[[Contracts-Part03]]"
  - "[[Contracts-Part04]]"
  - "[[Contracts-Part06]]"
  - "[[EventAPI-Part01]]"
  - "[[EventAPI-Part02]]"
---

# Contracts Specification (Part 02)

## Document Index

Part 01 - The command name registry (invoke commands)
Part 02 - The event name registry (Eulinx:// events)
Part 03 - Request and response shapes per command
Part 4 - Shared field and envelope types
Part 05 - The error code registry
Part 06 - API versioning and the change log

# Purpose

This part is the event registry: the closed list of every `Eulinx://` event name that may be broadcast on the `listen` channel. It is the canonical counterpart to [[Contracts-Part01]] and the source for [[EventAPI-Part02]]. Every name is past tense and belongs to exactly one family. The EventBus enforces that no other name is published ([[EventBus-Part01]]).

# The Event Registry

Each entry lists the name, the publishing service, and whether it is replay-grade (`RG`). A `yes` means the event MUST be durably logged before delivery and MUST NOT be dropped ([[EventAPI-Part04]]).

## Worker family

- `Eulinx://worker/spawned` (RG yes) — WorkerSpawner.
- `Eulinx://worker/state_changed` (RG yes) — Worker state machine.
- `Eulinx://worker/output_streamed` (RG no) — WorkerSpawner, high-frequency, coalesced.
- `Eulinx://worker/process_exited` (RG yes) — WorkerSpawner.
- `Eulinx://worker/terminated` (RG yes) — WorkerSpawner.
- `Eulinx://worker/refinement_progress` (RG no) — WorkerSpawner, coalesced.

## Task family

- `Eulinx://task/created` (RG yes)
- `Eulinx://task/assigned` (RG yes)
- `Eulinx://task/status_changed` (RG yes)
- `Eulinx://task/completed` (RG yes)
- `Eulinx://task/failed` (RG yes)

## Artifact family

- `Eulinx://artifact/created` (RG yes)
- `Eulinx://artifact/versioned` (RG yes)
- `Eulinx://artifact/verified` (RG yes)
- `Eulinx://artifact/merged` (RG yes)
- `Eulinx://artifact/rejected` (RG yes)

## Execution family

- `Eulinx://execution/started` (RG yes)
- `Eulinx://execution/progress_reported` (RG no) — coalesced by executionId.
- `Eulinx://execution/completed` (RG yes)
- `Eulinx://execution/failed` (RG yes)

## Lock family

- `Eulinx://lock/granted` (RG yes)
- `Eulinx://lock/denied` (RG yes)
- `Eulinx://lock/released` (RG yes)
- `Eulinx://lock/conflict_detected` (RG yes)

## Merge family

- `Eulinx://merge/conflict_detected` (RG yes)
- `Eulinx://merge/auto_merged` (RG yes)
- `Eulinx://merge/manual_merge_required` (RG yes)
- `Eulinx://merge/applied` (RG yes)

## Memory family

- `Eulinx://memory/injected` (RG yes)
- `Eulinx://memory/channel_posted` (RG no) — summary metadata, high frequency.
- `Eulinx://memory/summarized` (RG yes)

## Workflow family

- `Eulinx://workflow/node_added` (RG yes)
- `Eulinx://workflow/node_removed` (RG yes)
- `Eulinx://workflow/edge_added` (RG yes)
- `Eulinx://workflow/graph_mutated` (RG yes) — a Worker spawned a sub-Worker.
- `Eulinx://workflow/run_started` (RG yes)
- `Eulinx://workflow/run_completed` (RG yes)

## Session family

- `Eulinx://session/opened` (RG yes)
- `Eulinx://session/closed` (RG yes)
- `Eulinx://session/terminal_attached` (RG yes)

## Permission family

- `Eulinx://permission/denied` (RG yes)
- `Eulinx://permission/granted` (RG yes)
- `Eulinx://permission/approval_required` (RG yes)

## Plugin family

- `Eulinx://plugin/installed` (RG yes)
- `Eulinx://plugin/enabled` (RG yes)
- `Eulinx://plugin/disabled` (RG yes)
- `Eulinx://plugin/quarantined` (RG yes)

## EventBus family

- `Eulinx://eventbus/subscriber_dropped_event` (RG yes)
- `Eulinx://eventbus/log_write_failed` (RG yes)
- `Eulinx://eventbus/service_health_changed` (RG yes)

## Runtime family

- `Eulinx://runtime/ready` (RG yes)
- `Eulinx://runtime/degraded` (RG yes)
- `Eulinx://runtime/failed` (RG yes)
- `Eulinx://runtime/invariant_violated` (RG yes)

# AI Notes

Do not publish a name not in this list. The catalog is closed; add it to Contracts, then emit.

Do not use present tense. `Eulinx://worker/spawn` is a command, not an event ([[EventAPI-Part01]]).

Do not mark a high-frequency stream replay-grade. `output_streamed`, `progress_reported`, and `channel_posted` are `no` for a reason ([[EventAPI-Part04]]).

Do not assume a plugin received a plugin-family event. Plugin delivery is on the lossy queue ([[EventAPI-Part04]]).

# Related Documents

- [[15-api/README]]
- [[Contracts-Part01]]
- [[Contracts-Part03]]
- [[Contracts-Part04]]
- [[Contracts-Part06]]
- [[EventAPI-Part01]]
- [[EventAPI-Part02]]
- [[EventBus-Part01]]
