---
title: EventAPI Specification - Part 04
status: draft
version: 1.0
tags:
  - api
  - event-api
  - delivery
  - plugin-queue
related:
  - "[[15-api/README]]"
  - "[[EventAPI-Part01]]"
  - "[[EventAPI-Part02]]"
  - "[[EventAPI-Part03]]"
  - "[[EventAPI-Part05]]"
  - "[[EventBus-Part01]]"
  - "[[EventBus-Diagrams]]"
  - "[[IPC-Part03]]"
---

# EventAPI Specification (Part 04)

## Document Index

Part 01 - Catalog purpose, the facts-not-commands rule, and the naming scheme
Part 02 - The typed event families by domain
Part 03 - The event payload contract and required fields
Part 04 - Deliverability classes and the plugin queue
Part 05 - The event lifecycle, emission rules, and consistency with Contracts

# Purpose

This part specifies the deliverability classes of events and how they reach each subscriber class. The EventBus defines three delivery classes ([[EventBus-Part01]]); this part maps them onto the EventAPI catalog so a publisher and a subscriber both know the guarantee. The single most important rule: a plugin subscriber NEVER blocks core delivery.

# The Three Classes

**Core (guaranteed).** Replay-grade facts and structural events: `Eulinx://worker/spawned`, `Eulinx://artifact/merged`, `Eulinx://merge/conflict_detected`, `Eulinx://lock/granted`, `Eulinx://permission/denied`, `Eulinx://runtime/*`. Core events are never dropped. On the core queue they use `send().await` with backpressure; if a core subscriber lags beyond a timeout, the Runtime degrades and eventually fails rather than drop the event ([[EventBus-Part01]]).

**UI (batched, best-effort).** High-frequency streams and progress: `Eulinx://worker/output_streamed`, `Eulinx://execution/progress_reported`. These are coalesced by the UI Batcher ([[IPC-Part03]], [[EventBus-Diagrams]]) and may be dropped on UI-queue overflow — but only non-replay-grade ones, and `droppedSinceLastBatch` is reported so the UI can show "stream truncated".

**Plugin (lossy).** Events delivered to plugin subscribers live on a separate, lossy queue. A slow or crashing plugin NEVER blocks core or UI delivery ([[EventBus-Part01]], [[PluginAPI-Part01]]). A plugin queue overflow drops the oldest event; repeated drops quarantine the plugin ([[EventAPI-Part02]] `Eulinx://plugin/quarantined`).

# Routing by Class

The EventBus routes an event to the class(es) appropriate to its nature:

- replay-grade events → core queue (and logged before delivery)
- high-frequency streams → ui queue + coalesced; also mirrored to core only if replay-grade (they are not)
- plugin-observable events → plugin queue (lossy), tagged with `plugin_id`
- core subscribers are NEVER on the plugin queue; plugin subscribers are NEVER on the core queue

This separation is the reason a misbehaving plugin cannot stall the Runtime. The EventBus "isolates plugin subscribers from core delivery" rule ([[EventBus-Part01]]) is the guarantee behind the whole class model.

# Replay-Grade Flag

The `replay_grade` payload field ([[EventAPI-Part03]]) decides logging and dropping:

- true → MUST be written to the event log before delivery; MUST NOT be dropped; drives Replay ([[EventBus-Part05]])
- false → MAY be coalesced or dropped on the ui/plugin queues; never logged for replay

A publisher sets `replay_grade` based on whether the fact is needed to reconstruct state. Terminal output is false; a spawn or merge is true.

# Delivery Guarantees Summary

```text
Class    Replay-grade event   High-frequency event   Blocks publisher?
------   ------------------   --------------------   -----------------
core     never dropped        never dropped          yes, via backpressure
ui       never dropped        may drop, coalesced    no
plugin   may drop             may drop               no, ever
```

# AI Notes

Do not mark a high-frequency stream replay-grade. Output streams would flood the replay log and the ui/plugin queues would behave wrong.

Do not assume a plugin received your event. The plugin queue is lossy; if a plugin must not miss a fact, that fact is core, not plugin.

Do not let a plugin subscriber slow the core path. The queues are separate on purpose; a slow plugin drops, the Runtime continues.

Do not rely on UI-queue delivery for trusted state. Only core events update the runtime mirror; coalesced streams update transient terminal buffers only ([[FrontendAPI-Part02]]).

# Related Documents

- [[15-api/README]]
- [[EventAPI-Part01]]
- [[EventAPI-Part02]]
- [[EventAPI-Part03]]
- [[EventAPI-Part05]]
- [[EventBus-Part01]]
- [[EventBus-Diagrams]]
- [[IPC-Part03]]
- [[PluginAPI-Part01]]
- [[FrontendAPI-Part02]]
