---
title: PromptTemplates - Part 01
status: draft
version: 1.0
tags:
  - ai-context
  - prompt-templates
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/PromptTemplates/PromptTemplates-Part02]]"
  - "[[99-ai-context/CodingRules/CodingRules-Part01]]"
---

# PromptTemplates (Part 01) — Coding Task Skeletons

## Document Index

Part 01 - Coding-task prompt skeletons for the AI coding model
Part 02 - Architecture / spec and feature prompt skeletons

These are reusable skeletons you can paste to the cheap coding model (DeepSeek V4 Flash). Fill the brackets. Keep each task small and verifiable. Always attach the relevant spec Part links so the model has context.

## Skeleton A — Implement a runtime service (TypeScript)

```text
You are implementing ONE small part of Eulinx, a local-first desktop multi-agent
AI automation app (Tauri v2 + React 19 + TypeScript + Vite + pnpm).

Read first (context):
- [[02-runtime/README]]
- <link the specific service Part, e.g. [[Scheduler-Part01]]>
- [[99-ai-context/CodingRules/CodingRules-Part01]]

Task: Implement <ServiceName> in TypeScript only (no Rust).
Rules:
- Deterministic, no LLM calls.
- Expose via a typed service module; components never call invoke directly.
- Emit facts on the EventBus; do not command via events.
- Keep business logic in the service/store, not in components.
Acceptance criteria:
- <criterion 1>
- <criterion 2>
- Unit test included.
Do not widen Rust scope. Do not write code into the docs.
```

## Skeleton B — Implement a UI component (token-driven)

```text
You are implementing ONE Eulinx UI piece (React 19 + TypeScript + Tailwind + shadcn/ui).

Read first:
- [[07-ui-ux/README]]
- [[99-ai-context/DesignRules/DesignRules-Part01]]
- <link the relevant UI Part>

Task: Build <ComponentName> as a global wrapper around shadcn/ui.
Rules:
- NO hardcoded colors/spacing/typography; use design tokens only.
- Use the Eulinx icon wrapper, not direct Lucide imports.
- If it is an overlay (modal/popover/tooltip/dropdown), add focus trap,
  escape handling, scroll lock, and collision detection.
- Reflect state from Zustand/TanStack Query; never own truth locally.
Acceptance criteria:
- <criterion 1>
- <criterion 2>
```

## Skeleton C — Wire an EventBus subscription safely

```text
Task: Subscribe to <event name> in <store/hook>.
Rules:
- Use the centralized EventBus client; store the unlisten handle.
- Release unlisten on teardown (unmount or store dispose).
- Update state ONLY from the event payload; no optimistic state.
- Do not use events to command the backend.
Acceptance: listener added/removed exactly once per lifecycle; no leaks.
```

## AI Notes

Keep each prompt to ONE small task. Large prompts cause the cheap model to regress.

Always attach spec links; the model reads them instead of guessing.

## Related Documents

- [[99-ai-context/PromptTemplates/PromptTemplates-Part02]]
- [[99-ai-context/CodingRules/CodingRules-Part01]]
- [[99-ai-context/AIChecklist/AIChecklist-Part01]]
