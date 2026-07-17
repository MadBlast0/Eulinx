---
title: FrontendAPI Specification - Part 04
status: draft
version: 1.0
tags:
  - api
  - frontend-api
  - events
  - subscription
related:
  - "[[15-api/README]]"
  - "[[FrontendAPI-Part01]]"
  - "[[FrontendAPI-Part02]]"
  - "[[FrontendAPI-Part03]]"
  - "[[IPC-Part03]]"
  - "[[EventAPI-Part01]]"
---

# FrontendAPI Specification (Part 04)

## Document Index

Part 01 - The TypeScript client surface, service modules, and the no-direct-Tauri rule
Part 02 - The runtime store mirror, the three state tiers, and the store slices
Part 03 - Command-call ergonomics, the `ApiError` type, and retry rules
Part 04 - The event subscription manager and idempotent handlers
Part 05 - Frontend API rules: no direct Tauri, idempotency, view state, degraded runtime

# Purpose

This part specifies the event subscription manager: the frontend mechanism that registers `listen` handlers, filters by workspace scope, delivers batches to the store reducers, and tears everything down on unmount or workspace switch. It is the frontend half of the listener lifecycle in [[IPC-Part03]].

# The Subscription Manager

The subscription manager is the only frontend owner of `listen` registrations. A service module's `on<EVENT>(handler)` does not call `listen` directly; it registers the handler with the manager, scoped to the active workspace. The manager holds the `unlisten` functions and the scope filter.

The manager is responsible for:

- opening the underlying `listen("Eulinx://events")` once per workspace
- dispatching each batch to the correct per-event handler set
- dropping any event whose `workspaceId` does not match the active workspace
- tearing down all handlers when the workspace switches or the window closes
- re-opening handlers for the new workspace after switch

A component that needs an event binds through `service.on<EVENT>` inside an effect and returns the manager's deregister function in cleanup. This guarantees the pairing that [[IPC-Part03]] mandates without every component re-implementing it.

# Handler Dispatch

When a `Eulinx://events` batch arrives, the manager:

- splits the batch into individual events
- for each event, looks up the registered handlers for that event name
- invokes each handler with the typed payload from [[Contracts-Part02]]
- ignores events with a mismatched `workspaceId` (no handler sees them)

The store reducer actions ([[FrontendAPI-Part02]]) are the primary handlers; UI components may also register transient handlers (e.g., to flash a toast on `Eulinx://permission/denied`). Both go through the same manager.

# Idempotency

Every handler MUST be idempotent because events can arrive late, twice, or out of order ([[IPC-Part03]]). The manager does not deduplicate; the handler or reducer does, using the event `sequence` and `eventId`:

- applying the same `eventId` twice is a no-op
- applying an event for a `workerId` no longer in the active workspace is ignored
- applying an event whose `workspaceId` differs is dropped at the boundary (never reaches a handler)

# Transient vs Persistent Handlers

- **Persistent handlers** are registered for the lifetime of the workspace: the store reducers. They are managed internally by the FrontendAPI core and are not the component's concern.
- **Transient handlers** are registered by a component for UI feedback (toasts, sounds, focus). They are registered in an effect and deregistered in cleanup. If a component forgets to deregister, the manager still tears it down on workspace switch, but the component SHOULD clean up to avoid stale callbacks within a session.

# Workspace Switch

On workspace switch the manager MUST: tear down all handlers for the old workspace, flush any in-flight batch, then open handlers for the new workspace. The order matters: opening the new workspace's listeners before tearing down the old risks double-apply and cross-workspace writes. The runtime mirror is also reset to the new workspace's hydrated state at this point ([[FrontendAPI-Part02]]).

# AI Notes

Do not call `listen` directly in a component. Use `service.on<EVENT>` and return its deregister in cleanup. The manager handles scope and switch.

Do not register a handler that writes Tier 1 state outside the store reducer. Only the reducer actions write the runtime mirror; a component handler that sets store state directly corrupts the single-source rule.

Do not assume handler order. Register handlers as independent; never depend on another handler having run first.

Do not keep a transient handler across a workspace switch intentionally. Let the manager tear it down; re-register for the new workspace if still needed.

# Related Documents

- [[15-api/README]]
- [[FrontendAPI-Part01]]
- [[FrontendAPI-Part02]]
- [[FrontendAPI-Part03]]
- [[IPC-Part03]]
- [[EventAPI-Part01]]
- [[07-ui-ux/README]]
- [[Contracts-Part02]]
