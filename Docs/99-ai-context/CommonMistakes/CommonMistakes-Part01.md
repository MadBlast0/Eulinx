---
title: CommonMistakes - Part 01
status: draft
version: 1.0
tags:
  - ai-context
  - common-mistakes
  - anti-patterns
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/CommonMistakes/CommonMistakes-Part02]]"
  - "[[99-ai-context/CodingRules/CodingRules-Part01]]"
---

# CommonMistakes (Part 01) — State and Layering Anti-Patterns

## Document Index

Part 01 - State and layering anti-patterns
Part 02 - Rust, theming, plugin, and safety anti-patterns

These are the failure modes the cheap coding model hits most often. Treat each as forbidden.

## Mistake 1 — Optimistic Worker / runtime state

Do not set a Worker to "running" or "done" in the UI before the backend confirms it via an EventBus event. Optimistic UI state for runtime objects causes ghost nodes, stuck spinners, and false completions. The runtime owns truth; reflect it, do not predict it.

## Mistake 2 — Unlisten leaks

Every `listen` subscription MUST be paired with `unlisten`. Forgetting to release the handle on unmount or store teardown causes duplicate handlers, ghost updates, and memory growth that compounds as workers spawn. Use one centralized EventBus client that owns subscription lifecycles.

## Mistake 3 — Calling `invoke` from a component

Components MUST go through a service. Direct `invoke` calls scatter the IPC surface, bypass typing, and pull business logic into the view. This is the most common layering violation.

## Mistake 4 — Business logic in components/hooks

Do not compute permissions, merge logic, scheduling, or context assembly inside a React component. Push it to the services layer or a store. Components render; they do not decide.

## Mistake 5 — UI as source of truth

Do not derive authoritative state from local component state. Use Zustand for project state and TanStack Query for server-shaped data; update only from events/queries.

## AI Notes

If you are tempted to "just set the status locally so it feels fast", do not. Wait for the event.

If you add a `listen`, immediately add its `unlisten`.

## Related Documents

- [[99-ai-context/CommonMistakes/CommonMistakes-Part02]]
- [[99-ai-context/CodingRules/CodingRules-Part03]]
- [[07-ui-ux/README]]
