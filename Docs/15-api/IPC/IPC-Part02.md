---
title: IPC Specification - Part 02
status: draft
version: 1.0
tags:
  - api
  - ipc
  - naming
  - events
related:
  - "[[15-api/README]]"
  - "[[IPC-Part01]]"
  - "[[IPC-Part03]]"
  - "[[Contracts-Part01]]"
  - "[[Contracts-Part02]]"
  - "[[EventAPI-Part01]]"
---

# IPC Specification (Part 02)

## Document Index

Part 01 - The two channels, direction rules, serialization, and the error envelope
Part 02 - Command naming, event naming (`Eulinx://`), and the channel dispatch table
Part 03 - Listener lifecycle, batching, throttling, and backpressure
Part 04 - Security, workspace scope, and the error-handling contract

# Purpose

This part defines the naming scheme for everything that travels over IPC. Names are the contract: a command name and an event name are the stable identifiers the frontend, the Rust command layer, the runtime services, and plugins all agree on. A name change is a breaking API change and MUST go through the versioning process in [[Contracts-Part06]].

# Command Naming

Every `invoke` command has a snake_case name that is a verb phrase describing the action requested. The name MUST be specific to the object and the operation. Examples (all canonical, all defined in [[Contracts-Part01]]):

- `list_workers` — enumerate Workers in a workspace
- `spawn_worker` — create a new Worker terminal
- `terminate_worker` — stop a running Worker
- `request_lock` — ask the LockManager for a file or symbol lock
- `merge_artifact` — hand an Artifact to the MergeManager
- `save_setting` — persist a user setting for a workspace
- `run_verification` — invoke an objective verifier on an Artifact

The naming convention is `verb_object` or `verb_object_qualifier`. A command MUST NOT be named after a past-tense fact (`workers_listed` is wrong; `list_workers` is right). The full registry of command names lives in [[Contracts-Part01]]; this part only states the rule.

Commands are grouped by domain so the dispatch table is stable: `worker.*`, `task.*`, `artifact.*`, `lock.*`, `merge.*`, `memory.*`, `workflow.*`, `session.*`, `setting.*`, `provider.*`, `mcp.*`, `plugin.*`, `window.*`, `fs.*`. The dot is a documentation grouping only — the wire name is the flat snake_case string.

# Event Naming (`Eulinx://`)

Every `listen` event has a URI-style name beginning with `Eulinx://`, followed by a dot-grouped, past-tense fact. The `Eulinx://` prefix is what Tauri's `listen` registers against, and it namespaces Eulinx's events away from any plugin or system events. Examples (all canonical, all defined in [[EventAPI-Part01]] and [[Contracts-Part02]]):

- `Eulinx://worker/spawned`
- `Eulinx://worker/state_changed`
- `Eulinx://worker/output_streamed`
- `Eulinx://artifact/verified`
- `Eulinx://artifact/merged`
- `Eulinx://execution/progress_reported`
- `Eulinx://lock/granted`
- `Eulinx://merge/conflict_detected`
- `Eulinx://permission/denied`
- `Eulinx://eventbus/subscriber_dropped`

The rule is strict: an event name is **past tense** because it reports something that already happened. `worker.spawn` is a command and does not belong on the event channel. If a name feels like a verb, it is a command, not an event. The EventBus MUST NOT become a control channel, so the past-tense rule is also a correctness rule, not just a style rule (see [[EventBus-Part01]]).

Event names are grouped by domain matching the command groups: `Eulinx://worker/...`, `Eulinx://task/...`, `Eulinx://artifact/...`, `Eulinx://execution/...`, `Eulinx://lock/...`, `Eulinx://merge/...`, `Eulinx://memory/...`, `Eulinx://workflow/...`, `Eulinx://session/...`, `Eulinx://permission/...`, `Eulinx://plugin/...`, `Eulinx://eventbus/...`, `Eulinx://runtime/...`.

# The Channel Dispatch Table

The dispatch table maps every name to a direction and an owner. It is the single reference a model uses to know which channel a name belongs on:

```text
Direction = invoke   -> UI requests a change (command)
Direction = listen   -> Runtime reports a fact (event)

worker.spawn            invoke   -> RustAPI spawn_worker -> ServiceAPI WorkerSpawner
Eulinx://worker/spawned    listen   <- EventBus <- WorkerSpawner
Eulinx://worker/state_changed  listen  <- EventBus <- Worker state machine
worker.output_streamed  (n/a)    streamed via Eulinx://worker/output_streamed (listen)

artifact.merge          invoke   -> RustAPI merge_artifact -> ServiceAPI MergeManager
Eulinx://artifact/merged    listen   <- EventBus <- MergeManager
Eulinx://artifact/verified  listen   <- EventBus <- Verifier

lock.request            invoke   -> RustAPI request_lock -> ServiceAPI LockManager
Eulinx://lock/granted       listen   <- EventBus <- LockManager
Eulinx://lock/denied        listen   <- EventBus <- LockManager
```

The full table is the union of [[Contracts-Part01]] (commands) and [[Contracts-Part02]] (events). This part states the rule; the Contracts parts hold the exhaustive list.

# High-Frequency vs Replay-Grade

Some events are high-frequency by nature: `Eulinx://worker/output_streamed` can fire thousands of times per second for a busy terminal. These are NOT replay-grade and are coalesced on the UI transport (see [[IPC-Part03]] and [[EventBus-Diagrams]]). Other events are replay-grade: `Eulinx://worker/spawned`, `Eulinx://artifact/merged`, `Eulinx://merge/conflict_detected`. These MUST be durably logged before delivery so Replay can reconstruct state (see [[EventBus-Part05]]).

The IPC layer does not decide replay-grade status; the EventBus does. But the IPC layer MUST respect it: a replay-grade event is flushed to the UI immediately and never dropped, while a high-frequency event may be coalesced or, on the UI queue only, dropped if the batch overflows (never on the core queue).

# AI Notes

Do not name an event in the present or imperative tense. If you write `Eulinx://worker/spawn`, you have written a command on the event channel, which turns the EventBus into a control channel and breaks [[EventBus-Part01]].

Do not invent a `Eulinx://` name that is not in [[Contracts-Part02]]. If a new fact must be broadcast, add it to Contracts first, then to [[EventAPI-Part01]], then to the publishing service.

Do not reuse a command name for an event or vice versa. The flat snake_case command and the `Eulinx://` event are disjoint namespaces by design.

Do not put a high-frequency stream (terminal output) into a replay-grade event. Tag it correctly so the bus coalesces it and the UI does not store megabytes of log in the replay buffer.

# Related Documents

- [[15-api/README]]
- [[IPC-Part01]]
- [[IPC-Part03]]
- [[IPC-Part04]]
- [[Contracts-Part01]]
- [[Contracts-Part02]]
- [[EventAPI-Part01]]
- [[EventBus-Part01]]
- [[RustAPI-Part01]]
