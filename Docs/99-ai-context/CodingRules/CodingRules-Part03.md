---
title: CodingRules - Part 03
status: draft
version: 1.0
tags:
  - ai-context
  - coding-rules
  - state
  - eventbus
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/CodingRules/CodingRules-Part02]]"
  - "[[99-ai-context/CodingRules/CodingRules-Part04]]"
  - "[[07-ui-ux/README]]"
---

# CodingRules (Part 03) — State, Services, EventBus

## Document Index

Part 01 - Small tasks, no merged layers, fail-closed
Part 02 - TypeScript-first, Rust boundary, no code in specs
Part 03 - State, services, and EventBus discipline
Part 04 - Testing, git, and naming rules

## Rule 9 — UI state is reflected, not owned

Project-scoped state lives in Zustand stores; async/server-shaped data is fetched and cached with TanStack Query. The runtime owns truth. The UI updates only because an EventBus event or a query invalidation told it to. Do not derive authoritative truth from local component state.

## Rule 10 — All `invoke` goes through a service

No component calls `invoke` directly. Create a service module per domain; components and hooks call the service. This keeps the IPC surface small, typed, and testable, and keeps business logic out of the view.

## Rule 11 — Subscribe and unlisten correctly

Every `listen` MUST have a matching `unlisten` (store the unlisten handle and release it on unmount or store teardown). Leaking listeners is a top cause of ghost updates and memory growth. Prefer a single centralized EventBus client that manages subscription lifecycles.

## Rule 12 — Events describe truth, not commands

The EventBus broadcasts facts (Task Started, Terminal Closed, Artifact Created, Workflow Finished). Do not use events to command the backend; use `invoke`. Do not use `invoke` to push state to the UI; use events.

## AI Notes

Do not leave an `unlisten` dangling. Track and release it.

Do not put fetch/cache logic inline in a component; use TanStack Query.

Do not treat the EventBus as a command channel.

## Related Documents

- [[99-ai-context/CodingRules/CodingRules-Part02]]
- [[99-ai-context/CodingRules/CodingRules-Part04]]
- [[02-runtime/README]]
- [[07-ui-ux/README]]
