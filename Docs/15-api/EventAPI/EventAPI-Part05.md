---
title: EventAPI Specification - Part 05
status: draft
version: 1.0
tags:
  - api
  - event-api
  - lifecycle
  - consistency
related:
  - "[[15-api/README]]"
  - "[[EventAPI-Part01]]"
  - "[[EventAPI-Part02]]"
  - "[[EventAPI-Part03]]"
  - "[[EventAPI-Part04]]"
  - "[[Contracts-Part02]]"
  - "[[Contracts-Part06]]"
  - "[[EventBus-Part01]]"
---

# EventAPI Specification (Part 05)

## Document Index

Part 01 - Catalog purpose, the facts-not-commands rule, and the naming scheme
Part 02 - The typed event families by domain
Part 03 - The event payload contract and required fields
Part 04 - Deliverability classes and the plugin queue
Part 05 - The event lifecycle, emission rules, and consistency with Contracts

# Purpose

This part specifies the lifecycle of an event from emission to delivery, the emission rules a publisher MUST follow, and the consistency requirement that binds EventAPI to [[Contracts-Part02]]. The runtime behavior of publication is in [[EventBus-Part01]] and [[EventBus-Diagrams]]; this part is the API-side contract a publishing service and a subscribing frontend both rely on.

# The Event Lifecycle

1. **Emit.** A runtime service builds a `EulinxEvent` with `type`, `payload`, `workspace_id`, `correlation_id`/`causation_id` as relevant, and `replay_grade`. It calls `EventBus.publish`.
2. **Assign.** The bus assigns a unique `event_id` and a monotonic `sequence` (per source).
3. **Grade.** If replay-grade, the bus writes the event to the durable log BEFORE acknowledging publication. A log write failure causes the publisher to roll back its operation ([[EventBus-Part01]]).
4. **Route.** The bus routes the event to the core queue (guaranteed), the ui queue (batched), and/or the plugin queue (lossy) per its class ([[EventAPI-Part04]]).
5. **Deliver.** Core subscribers receive via backpressure; UI receives via the batcher; plugins receive best-effort. The frontend dispatches a batch through the subscription manager ([[FrontendAPI-Part04]]).
6. **Handle.** Subscribers react. No subscriber mutates the Runtime; an event is a fact, not a command ([[EventAPI-Part01]]).

# Emission Rules

A publishing service MUST:

- emit only event names in [[Contracts-Part02]]; the catalog is closed
- set `workspace_id` on every event; never cross a Workspace boundary without explicit scope
- set `replay_grade` correctly (true for state-reconstructing facts, false for streams)
- not publish from inside a LockManager lock; release first ([[EventBus-Part01]])
- not mutate the payload after publish; it is immutable
- not expect an acknowledgement or return value; publishing is fire-and-forget
- correlate the event to the causing command via `correlation_id` when applicable

A publishing service MUST NOT:

- emit a present-tense or imperative name (that is a command; route it through IPC)
- emit an event that triggers a Runtime action in a subscriber (the bus is not a control channel)
- carry a handle or secret in the payload
- publish on the plugin queue as if it were core; plugin delivery is lossy by design

# Consistency with Contracts

The EventAPI catalog MUST stay in lockstep with [[Contracts-Part02]]. The rules:

- every `Eulinx://` name emitted anywhere is registered in Contracts
- the payload shape per name is defined in Contracts and matches the service's emission
- adding, removing, or renaming an event is a breaking API change recorded in [[Contracts-Part06]]
- a service emitting an unregistered name is a defect, caught by the closed catalog

Because the frontend's handler set is derived from the same Contracts list, consistency guarantees the UI has a handler for every event the Runtime can emit and vice versa.

# Versioning

Event additions that are purely additive (a new optional field, a new event name) are non-breaking within an API major version if the frontend tolerates unknown fields. Renaming or removing an event, or changing a required field's meaning, bumps the API major version ([[Contracts-Part06]], [[PluginAPI-Part04]] semver). The EventBus itself is version-stable; events are versioned through the API version, not a per-event version.

# AI Notes

Do not publish from inside a lock. Release the lock, then publish; the bus warns this deadlocks.

Do not emit an unregistered name. The catalog is closed; add it to Contracts first.

Do not make an event cause a Runtime action. If a subscriber must act, it issues a command; the event stays a fact.

Do not skip `workspace_id`. An unscoped event cannot be filtered and may leak across workspaces.

Do not treat event publication as awaiting anything. It is fire-and-forget; a return value would make the bus a control channel.

# Related Documents

- [[15-api/README]]
- [[EventAPI-Part01]]
- [[EventAPI-Part02]]
- [[EventAPI-Part03]]
- [[EventAPI-Part04]]
- [[Contracts-Part02]]
- [[Contracts-Part06]]
- [[EventBus-Part01]]
- [[EventBus-Diagrams]]
- [[FrontendAPI-Part04]]
- [[IPC-Part03]]
