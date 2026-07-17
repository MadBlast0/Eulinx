---
title: EventAPI Specification - Part 01
status: draft
version: 1.0
tags:
  - api
  - event-api
  - event-bus
  - events
related:
  - "[[15-api/README]]"
  - "[[EventAPI-Part02]]"
  - "[[EventAPI-Part03]]"
  - "[[EventAPI-Part04]]"
  - "[[EventAPI-Part05]]"
  - "[[EventBus-Part01]]"
  - "[[IPC-Part01]]"
---

# EventAPI Specification (Part 01)

## Document Index

Part 01 - Catalog purpose, the facts-not-commands rule, and the naming scheme
Part 02 - The typed event families by domain
Part 03 - The event payload contract and required fields
Part 04 - Deliverability classes and the plugin queue
Part 05 - The event lifecycle, emission rules, and consistency with Contracts

# Purpose

EventAPI is the catalog of every event that travels over the `listen` channel from the Runtime to the UI, the log, the Replay recorder, the metrics tap, and plugin subscribers. It is the one-way broadcast counterpart to IPC. Where IPC carries commands (UI asks), EventAPI carries facts (Runtime reports). The authoritative runtime behavior of the bus is in [[EventBus-Part01]]; this part specifies the event *catalog* — the names, families, and the rule that makes the bus a broadcast of truth, not a control channel.

# The Facts-Not-Commands Rule

An event is a statement about something that already happened. It is past tense, immutable, and MUST NOT be a request, command, or question. This rule is the heart of the EventBus ([[EventBus-Part01]]) and it is restated here as the first law of the EventAPI:

- `Eulinx://worker/spawned` is an event — a Worker exists.
- `worker.spawn` is NOT an event — it is a command and belongs in IPC/RustAPI ([[IPC-Part02]]).

If a name feels like a verb, it is a command, not an event. An event MUST NOT let a subscriber change what the Runtime does; the moment a subscriber can veto, delay, or cause an action, the EventBus has become a control channel and the boundary is broken. The EventBus "MUST NOT become a control channel" rule ([[EventBus-Part01]]) is enforced by this naming law.

# The Naming Scheme

Every event name is a URI beginning with `Eulinx://`, followed by a dot-grouped, past-tense fact. The `Eulinx://` prefix namespaces Eulinx's events for Tauri's `listen` and separates them from plugin or system events.

Structure: `Eulinx://<domain>/<past_tense_fact>`.

The domain groups mirror the command groups ([[IPC-Part02]]) so a command and its resulting event live in the same conceptual namespace: `worker`, `task`, `artifact`, `execution`, `lock`, `merge`, `memory`, `workflow`, `session`, `permission`, `plugin`, `eventbus`, `runtime`.

The full list of event names is in [[EventAPI-Part02]] and is canonical in [[Contracts-Part02]]. This part states the rule; the Contracts part holds the registry.

# The Catalog Is Enumerated

Unlike an open event system, Eulinx's event catalog is closed. A service MAY NOT emit an event name that is not in [[Contracts-Part02]]. Adding a new fact requires adding it to Contracts first, then to the publishing service, then to the UI handler. This closure is what keeps the frontend's handler set complete and the Replay log parseable.

# Relationship to IPC

The `listen` side of IPC ([[IPC-Part01]]) is the transport; EventAPI is the content. IPC says "events flow Runtime → UI, one-way, batched". EventAPI says "here is every event that can flow, with its name, family, and payload". The two are inseparable: a name in EventAPI is the name registered in IPC, and both are registered in Contracts.

# AI Notes

Do not name an event in the present or imperative tense. `Eulinx://worker/spawn` is a command on the event channel; rename it to `Eulinx://worker/spawned` or move it to IPC.

Do not add an event name not in [[Contracts-Part02]]. The catalog is closed; add it to Contracts, then emit.

Do not let an event cause a Runtime action. If a subscriber must act, the action is a command it issues, not something the event triggers in the bus.

Do not confuse the event name with the payload type. The name is `Eulinx://worker/state_changed`; the payload is the state struct from [[EventAPI-Part03]].

# Related Documents

- [[15-api/README]]
- [[EventAPI-Part02]]
- [[EventAPI-Part03]]
- [[EventAPI-Part04]]
- [[EventAPI-Part05]]
- [[EventBus-Part01]]
- [[IPC-Part01]]
- [[IPC-Part02]]
- [[Contracts-Part02]]
