---
title: ImplementationOrder - Part 01
status: draft
version: 1.0
tags:
  - ai-context
  - implementation-order
  - roadmap
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/CurrentProgress/CurrentProgress-Part01]]"
  - "[[13-roadmap/README]]"
---

# ImplementationOrder (Part 01) — Dependency Order

## Document Index

Part 01 - Dependency order from the Implementation-Flow phases

This note condenses the [[13-roadmap/README]] Implementation-Flow (PHASE 00 → PHASE 21) into the order an AI should follow. A later phase MUST NOT begin until its prerequisites are complete and tested. Break every phase into small, verifiable tasks.

## Dependency order

This list MUST match the Implementation-Flow phases (PHASE 00 → PHASE 21) in `Implementation-Flow.md` exactly. A later phase MUST NOT begin until its prerequisites are complete and tested. Break every phase into small, verifiable tasks.

1. **PHASE 00 — Project Initialization:** Tauri v2 + React 19 + TS + Vite + pnpm, lint/prettier/tsconfig, Git, global design system skeleton (tokens, theme provider, base wrappers). No features yet.
2. **PHASE 01 — Foundation:** RuntimeManager foundation, project scaffolding, deterministic base.
3. **PHASE 02 — Runtime Kernel:** RuntimeManager, lifecycle, bootstrap, shutdown, registry, configuration, diagnostics, health, recovery, APIs.
4. **PHASE 03 — Event Bus:** EventBus, dispatcher, subscribers, publishers, queue, replay, history, dead-letter queue, middleware, async events, registry.
5. **PHASE 04 — State System:** runtime/worker/session/workflow/artifact/task state, persistence, snapshots, recovery.
6. **PHASE 05 — Resource Manager:** CPU, memory, disk, network, GPU, token budget, cost budget, quotas, limits, monitoring.
7. **PHASE 06 — Scheduler:** queue, priority queue, FIFO, parallel queue, delayed/cron jobs, retry/dead queue, policies, allocation, concurrency, fairness, rate limiting, backpressure, cancellation.
8. **PHASE 07 — Spawner:** WorkerSpawner, spawn queue, policies, worker/task/session factories, boot pipeline, resource reservation, cleanup, restart, recovery.
9. **PHASE 08 — Session System:** session creation, metadata, persistence, snapshots, replay, resume, branches, history, context, cleanup.
10. **PHASE 09 — Worker System:** worker base, manager, registry, lifecycle, messaging, context, health, recovery, scaling, pools, capabilities, coordination.
11. **PHASE 10 — Memory:** STM, LTM, episodic, semantic, working memory, embeddings, search, summaries, compression, pruning, policies, manager.
12. **PHASE 11 — Artifact System:** manager, registry, metadata, versioning, storage, references, dependency graph, search, import/export, history.
13. **PHASE 12 — Providers:** Claude, OpenAI, Gemini, Ollama, Hermes, OpenRouter, LM Studio, custom SDK, provider registry.
14. **PHASE 13 — Prompts:** templates, profiles, variables, context builder, prompt builder, cache, validation, versioning, optimization.
15. **PHASE 14 — Tool System:** filesystem, git, terminal, browser, HTTP, database, Docker, MCP, plugin loader, tool registry.
16. **PHASE 15 — Security:** permission manager, approval system, secret manager, policy engine, sandboxing, workspace/session isolation, auditing, authentication, authorization.
17. **PHASE 16 — Orchestrators:** planner, architect, researcher, programmer, reviewer, debugger, documentation, QA, release, coordinator.
18. **PHASE 17 — Workflows:** workflow engine, manager, DAG, dependencies, branches, parallelism, human approval, retry, resume, checkpoints, templates.
19. **PHASE 18 — CLI:** init, doctor, runtime, scheduler, spawn, worker, session, memory, artifact, provider, workflow, prompt, tool, config, plugin, update.
20. **PHASE 19 — UI:** dashboard, runtime monitor, worker explorer, session viewer, memory browser, artifact browser, prompt inspector, workflow designer, logs, metrics, cost dashboard, settings.
21. **PHASE 20 — Observability:** metrics, tracing, profiling, health checks, alerts, analytics, usage, cost tracking, performance.
22. **PHASE 21 — Release:** unit/integration/E2E/load tests, security audit, documentation audit, packaging, installers, auto update, crash recovery, backup, versioning, release pipeline.

The roadmap macro-phases (MVP, Phase 1–4 in [[13-roadmap/README]]) group these PHASE 00–21 as: Phase 1 = PHASE 00–06, Phase 2 = PHASE 07–10, Phase 3 = PHASE 11–15, Phase 4 = PHASE 16–21.

## MVP first

The MVP MUST prove the core loop headless before UI: Worker spawns → produces Artifact → Verifier → MergeManager → Workspace. Do not build UI before the runtime loop works.

## AI Notes

Do not implement a phase in one prompt.

Do not skip dependency phases; later systems assume earlier ones.

Do not widen Rust scope at any phase.

## Related Documents

- [[99-ai-context/CurrentProgress/CurrentProgress-Part01]]
- [[13-roadmap/README]]
- [[12-development/README]]
- [[02-runtime/README]]
