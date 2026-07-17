---
title: AIChecklist - Part 01
status: draft
version: 1.0
tags:
  - ai-context
  - ai-checklist
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/CodingRules/CodingRules-Part01]]"
  - "[[99-ai-context/CommonMistakes/CommonMistakes-Part01]]"
---

# AIChecklist (Part 01) — Pre-Coding Checklist

## Document Index

Part 01 - The checklist every AI runs before writing code

Run this checklist before every coding task. If any item fails, stop and resolve it first.

## Before you code

- [ ] Have I read the relevant spec Part(s) in the vault (not just this AI-context summary)?
- [ ] Do I know which layer owns this change (UI / services / IPC / Rust)?
- [ ] Is the task small and verifiable, with explicit acceptance criteria?
- [ ] Have I checked [[99-ai-context/ImplementationOrder/ImplementationOrder-Part01]] so I am not skipping a dependency phase?
- [ ] Do I know the authoritative state owner (Zustand store / TanStack Query), not local component state?

## While coding

- [ ] Am I routing all `invoke` through a service, never a component?
- [ ] Is business logic in the services layer / store, not in a component or hook?
- [ ] If I added a `listen`, did I add its `unlisten`?
- [ ] Are all colors/spacing/typography using design tokens, not hardcoded values?
- [ ] Is Rust only doing native OS work (PTY, fs, window, secure store, dialogs)?
- [ ] Did I avoid optimistic runtime state — waiting for EventBus confirmation?

## After coding

- [ ] Did I write/update a test for the changed logic?
- [ ] Did I keep the vault spec in sync if behavior changed?
- [ ] Did I avoid committing secrets or provider keys?
- [ ] Did I run lint, prettier, and typecheck?
- [ ] Did I avoid the anti-patterns in [[99-ai-context/CommonMistakes/CommonMistakes-Part01]]?

## AI Notes

Treat the checklist as a gate, not a formality. The cheap model's failures are predictable; this checklist prevents most of them.

## Related Documents

- [[99-ai-context/CodingRules/CodingRules-Part01]]
- [[99-ai-context/CommonMistakes/CommonMistakes-Part01]]
- [[99-ai-context/DesignRules/DesignRules-Part01]]
- [[16-testing/README]]
