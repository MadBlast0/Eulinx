---
title: Ideas Specification - Part 01
status: draft
version: 1.0
tags:
  - research
  - ideas
  - backlog
related:
  - "[[17-research/README]]"
  - "[[Ideas-Part02]]"
  - "[[FutureResearch-Part01]]"
---

# Ideas Specification (Part 01)

## Document Index

Part 01 - Product & UX idea backlog
Part 02 - Architecture & research idea backlog

# Purpose

Ideas is the raw, unrefined backlog. These are not specifications and not roadmap commitments. They are hunches, user-suggested features, and opportunities captured so they are not lost. Some will be promoted to [[13-roadmap/README]] or [[17-research/FutureResearch/FutureResearch-Part01]]; most will stay here.

# Idea I001 — Knowledge Base Per Workspace

Upload docs, PDFs, repos, notes; agents retrieve via semantic search (LanceDB). Captured from the product discussion as a major future feature. Promotes to: [[FutureResearch-Part01]] knowledge base.

# Idea I002 — Replay & Time Travel

Record an entire execution so users can replay step by step for debugging. Strongly aligned with [[04-memory/README]] Replay notes. Promotes to: [[FutureResearch-Part01]].

# Idea I003 — Snapshots Of Full Workspace State

Save and restore complete workspace state. Already partially specified in memory notes; here it stays as a product idea until promoted.

# Idea I004 — Simulation Mode

Show what agents would do without modifying files or calling external services. Valuable for trust and demos; candidate for future research.

# Idea I005 — Human Approval Gates As First-Class Nodes

Require approval before destructive actions (delete, push, publish). Reinforces the permission model ([[02-runtime/README]] PermissionManager).

# Idea I006 — Metrics Dashboard

Visualize token usage, cost, execution time, success rates per agent/workflow/project. Natural extension of worker metrics.

# Idea I007 — Template Gallery As Growth Engine

Browse/import community + official templates; publish your own. Directly derived from the n8n comparison ([[CompetitorAnalysis-Part01]]).

# Idea I008 — Different Critic vs Generator Models

Allow Ultra to use a cheap generator plus a stronger critic (e.g. different model for critic step). Already an open question in the PRD; kept here as a tracked idea.

# Related Documents

- [[Ideas-Part02]]
- [[FutureResearch-Part01]]
- [[13-roadmap/README]]
- [[04-memory/README]]
