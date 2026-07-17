---
title: FrontendAPI Specification - Part 05
status: draft
version: 1.0
tags:
  - api
  - frontend-api
  - rules
related:
  - "[[15-api/README]]"
  - "[[FrontendAPI-Part01]]"
  - "[[FrontendAPI-Part02]]"
  - "[[FrontendAPI-Part03]]"
  - "[[FrontendAPI-Part04]]"
  - "[[07-ui-ux/README]]"
  - "[[IPC-Part01]]"
---

# FrontendAPI Specification (Part 05)

## Document Index

Part 01 - The TypeScript client surface, service modules, and the no-direct-Tauri rule
Part 02 - The runtime store mirror, the three state tiers, and the store slices
Part 03 - Command-call ergonomics, the `ApiError` type, and retry rules
Part 04 - The event subscription manager and idempotent handlers
Part 05 - Frontend API rules: no direct Tauri, idempotency, view state, degraded runtime

# Purpose

This part collects the hard rules that govern the FrontendAPI. They are restated from [[07-ui-ux/README]] and [[IPC-Part01]] in API terms so a coding model implementing the frontend has them in one place. A violation of any of these is a defect, not a style choice.

# The Rules

The FrontendAPI MUST render only state that came from the backend over `invoke` or `listen`. It MUST treat every event as the authority over its local mirror.

The FrontendAPI MUST NOT let any component import `invoke` or `listen`. Only the transport adapter may. See [[FrontendAPI-Part01]].

The FrontendAPI MUST NOT mutate Tier 1 state from a component, click handler, or optimistic update. Only store reducers fed by events and command results write it. See [[FrontendAPI-Part02]].

The FrontendAPI MUST NOT enforce permissions. It MAY hide a control it knows will be denied, but the Rust command re-checks. A disabled button is a courtesy. See [[IPC-Part04]].

The FrontendAPI MUST assume every async operation can fail, arrive late, arrive twice, or arrive out of order. Every handler is idempotent. See [[FrontendAPI-Part04]] and [[IPC-Part03]].

The FrontendAPI MUST keep view-local state (Tier 3) out of the backend and backend state (Tier 1) out of `useState`. Tier 2 is persisted through `settingService`, debounced. See [[FrontendAPI-Part02]].

The FrontendAPI MUST survive the backend disappearing. A dead Runtime renders as a degraded, honest UI — a banner and disabled controls — not a frozen or lying one. See the degraded-runtime rule below.

The FrontendAPI MUST consume DesignTokens and MUST NOT hardcode a color, spacing, duration, or z-index. (Stated in [[07-ui-ux/README]]; included here because it is an API-adjacent invariant for any component that uses the API.)

The FrontendAPI MUST NOT block the main thread for more than 16ms in any handler. Terminal output and graph mutations are the two hot paths; both are virtualized and batched. See [[TerminalView-Part03]].

The FrontendAPI MUST match every `on<EVENT>` registration with a deregister in cleanup. The subscription manager makes this possible; components MUST use it. See [[FrontendAPI-Part04]].

# The Degraded Runtime Rule

When the Rust Runtime is unavailable (window closed, crash, or not yet ready), the FrontendAPI enters a degraded mode:

- commands reject with `runtime_unavailable` (a code in [[Contracts-Part05]])
- the UI shows a non-blocking banner, not a modal that traps the user
- Tier 1 state is frozen, not cleared; the last known mirror remains visible
- on `Eulinx://runtime/ready`, the API re-hydrates ([[FrontendAPI-Part02]]) and clears the banner

The degraded mode MUST NOT lie. It must not show a Worker as `running` if the Runtime is dead; it shows "last known: running, runtime disconnected". Honesty about unknown state is a core principle.

# The Unknown-State Rule

If a required field is missing from a payload, the API MUST render unknown, not a default guess. A Worker with no `state` renders as `unknown`, a spinner beats a guessed `idle`. This prevents the UI from presenting invented truth, which is the cardinal sin of [[07-ui-ux/README]].

# The Read-Model Rule

The frontend MUST NOT poll. If the UI seems to need fresh data, it is because an event is missing; add the event to [[EventAPI-Part01]] and [[Contracts-Part02]], do not add a polling timer. Polling duplicates the EventBus and creates two sources of truth.

# AI Notes

Do not add a polling interval "to keep the UI fresh". Add the missing event. Polling is the smell of a missing `Eulinx://` fact.

Do not clear Tier 1 on disconnect. Freeze it and show degraded. Clearing makes the user think their Workers died when only the Runtime did.

Do not guess a missing state. Render unknown. A wrong value is worse than a spinner because the user trusts it.

Do not write the store from a component to "fix" a display. If the display is wrong, the event or reducer is wrong; fix that.

Do not treat `runtime_unavailable` as a bug to suppress. Surface it honestly; the user needs to know the Runtime is gone.

# Related Documents

- [[15-api/README]]
- [[FrontendAPI-Part01]]
- [[FrontendAPI-Part02]]
- [[FrontendAPI-Part03]]
- [[FrontendAPI-Part04]]
- [[07-ui-ux/README]]
- [[IPC-Part01]]
- [[IPC-Part04]]
- [[Contracts-Part05]]
- [[TerminalView-Part03]]
