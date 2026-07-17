---
title: Phase1 Specification - Part 02
status: draft
version: 1.0
tags:
  - roadmap
  - phase1
  - events
  - state
related:
  - "[[Phase1-Part01]]"
  - "[[Phase1-Part03]]"
---

# Phase1 Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and Runtime Kernel
Part 02 - Event Bus, State System, Resource Manager
Part 03 - Scheduler, Completion, and Handoff

# Event Bus

The Event Bus is the nervous system. Every subsystem (runtime, workers, memory, artifacts, UI, plugins) communicates ONLY through published/subscribed events. No subsystem calls another directly.

Key mechanics:

- Publishers emit typed events (for example `worker/state_changed`, `artifact/created`, `task/completed`).
- Subscribers register by event type and priority.
- A dead-letter queue captures events that no subscriber handled or that errored, for later inspection.
- Middleware can enrich, filter, or log events.
- Replay and History let a later system reconstruct what happened.

The bus MUST be the only cross-subsystem communication path. This is what makes the plugin system (later) safe and powerful.

# State System

The State System makes everything persistent and recoverable.

It tracks, at minimum: runtime state, worker state, session state, workflow state, artifact state, task state.

It supports snapshots (point-in-time capture) and recovery (restore after crash). UI project state lives in Zustand; server-shaped/async data in TanStack Query; durable state in SQLite via this system.

State changes are emitted as events so the UI and other subsystems react without polling.

# Resource Manager

The Resource Manager governs finite capacity so the app does not become chaos when many workers exist (the concern raised in [[03-worker-system/README]]).

It tracks CPU, memory, disk, network, GPU, and—critically for AI—token budget and cost budget.

It enforces quotas and limits per workspace/plan, and exposes monitoring so the UI can show usage.

The Scheduler (Part 03) depends on the Resource Manager to decide what can run now.

# Token and Cost Budgets

Because Eulinx orchestrates model calls, token/cost budget is a first-class resource. The Resource Manager records every model call's token and cost impact and blocks or warns when a budget is exceeded. This directly supports the pricing tiers in [[01-core-concepts/README]].

# Related Documents

- [[Phase1-Part03]]
- [[Phase1-Part01]]
- [[02-runtime/README]]
- [[04-memory/README]]
