---
title: Ideas Specification - Part 02
status: draft
version: 1.0
tags:
  - research
  - ideas
  - architecture
related:
  - "[[17-research/README]]"
  - "[[Ideas-Part01]]"
  - "[[CompetitorAnalysis-Part02]]"
---

# Ideas Specification (Part 02)

## Document Index

Part 01 - Product & UX idea backlog
Part 02 - Architecture & research idea backlog

# Purpose

This note holds the architecture- and research-flavored ideas that are too speculative for specs but too promising to discard.

# Idea I009 — Worker Execution Beyond Terminals

An agent might later execute through Docker, Python, remote VM, SSH, browser, Kubernetes, or a cloud function — no terminal at all. The Agent/Worker is primary; the terminal is one capability (product discussion conclusion). Architectural principle to preserve in [[03-worker-system/README]].

# Idea I010 — Orchestrators Rewrite The Plan At Runtime

Let orchestrators create new phases when unexpected issues arise, so the graph literally grows while running. Distinctive UX opportunity; candidate for workflow engine research.

# Idea I011 — Progress Aggregation Pyramid

Worker 45% -> Task 73% -> Phase 61% -> Project 28%. Every level aggregates. Pure runtime-service computation; idea logged for the Scheduler/metrics.

# Idea I012 — Symbol-Level Locking

Lock functions/symbols, not whole files, so two workers edit the same file concurrently. Refinement of the Lock Manager design ([[02-runtime/README]]).

# Idea I013 — Event Bus As Plugin Backbone

Everything emits events (task started, file changed, terminal closed, plugin installed). Makes plugins powerful and decoupled. Aligns with EventBus spec.

# Idea I014 — Model Profiles Instead Of Raw Model Picks

Map intent (coding/reasoning/fast/cheap/offline) to internal model choice. Simpler UX; candidate for [[10-ai-system/README]].

# Idea I015 — Prompt Library & Inheritance

Version, share, import, test, template, and inherit prompts. Big opportunity carried from the product discussion; promote to AI system spec when scoped.

# Idea I016 — Marketplace For Workflows, Agent Teams, Prompts, Plugins, Templates

Community exchange economy. Directly supports the GTM wedge ([[MarketResearch-Part03]]).

# Promotion Rule

An idea is promoted when it has (a) a clear owner topic, (b) evidence or strong rationale, and (c) a roadmap home. Until then it lives here as a single indexed entry.

# Related Documents

- [[Ideas-Part01]]
- [[FutureResearch-Part01]]
- [[03-worker-system/README]]
- [[02-runtime/README]]
- [[10-ai-system/README]]
