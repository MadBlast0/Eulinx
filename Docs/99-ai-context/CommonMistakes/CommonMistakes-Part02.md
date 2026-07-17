---
title: CommonMistakes - Part 02
status: draft
version: 1.0
tags:
  - ai-context
  - common-mistakes
  - anti-patterns
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/CommonMistakes/CommonMistakes-Part01]]"
  - "[[99-ai-context/DesignRules/DesignRules-Part01]]"
---

# CommonMistakes (Part 02) — Rust, Theming, Plugin, Safety Anti-Patterns

## Document Index

Part 01 - State and layering anti-patterns
Part 02 - Rust, theming, plugin, and safety anti-patterns

## Mistake 6 — Hardcoded colors / tokens

Never hardcode a hex/rgb value, spacing, radius, or font in a component. Use design tokens. Hardcoding breaks theming and the "calm dark shell with one accent" rule.

## Mistake 7 — In-process / trusted plugins

Never load plugin code as trusted, in-process logic. Plugins are untrusted third-party code next to the user's source and keys. Isolate them, gate them by permission, and integrate via the SDK/hook system and MCP. Loading a plugin as trusted is a security defect.

## Mistake 8 — Widening the Rust surface

Do not move agent logic, workflow execution, memory strategy, or orchestration into Rust "because it is faster". Rust is the thin native bridge only. Business logic stays in TypeScript where the cheap model is reliable.

## Mistake 9 — Workers mutating the project directly

Never let a Worker write straight to the workspace. Produce an Artifact; let the Verifier and MergeManager apply it under LockManager control. Direct mutation causes cross-worker corruption and lost work.

## Mistake 10 — Sending raw chat between workers

Do not exchange full transcripts. Exchange Artifacts and scoped memory via the RunContext. Raw-chat fan-out explodes context windows and cost.

## Mistake 11 — Skipping the refinement guardrails

If you implement the refinement loop, you MUST include a stopping rule (judge or max iterations), a token/cost budget, and honest UX. Never claim the loop "equals a flagship model".

## AI Notes

When a plugin asks for broad access, deny by default and require explicit permission.

When two workers might edit the same file, route through the LockManager.

## Related Documents

- [[99-ai-context/CommonMistakes/CommonMistakes-Part01]]
- [[99-ai-context/DesignRules/DesignRules-Part01]]
- [[09-plugin-system/README]]
- [[02-runtime/README]]
