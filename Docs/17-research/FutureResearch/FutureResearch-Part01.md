---
title: FutureResearch Specification - Part 01
status: draft
version: 1.0
tags:
  - research
  - future
  - directions
related:
  - "[[17-research/README]]"
  - "[[FutureResearch-Part02]]"
  - "[[Experiments-Part01]]"
  - "[[Ideas-Part01]]"
---

# FutureResearch Specification (Part 01)

## Document Index

Part 01 - Strategic unknowns & capability-gap research directions
Part 02 - Evaluation, security, and ecosystem research directions

# Purpose

FutureResearch records investigation directions that are out of scope for v1 but strategically important. Unlike [[17-research/Ideas/Ideas-Part01]], these are framed as research questions with a stated gap, not just hunches. They feed the long-term roadmap ([[13-roadmap/README]]) and the experiment pipeline ([[17-research/Experiments/Experiments-Part01]]).

# Direction FR1 — Agent Capability Gaps (2026)

Research question: which of the documented gaps — live web, image/video understanding, media generation, publishing, deep research — should Eulinx grant first via MCP, and what is the marginal user value per capability?

Gap identified in market research; Eulinx answers via MCP capability nodes ([[10-ai-system/README]]). Open: prioritization order and hosted-vs-local split.

# Direction FR2 — Simulation Mode Evaluation

Research question: can we build a faithful simulator that predicts agent actions without side effects, and does it improve user trust and pre-deployment validation?

Tied to Idea I004. Method candidate: replay traces ([[04-memory/README]] Replay) replayed in a dry-run runtime.

# Direction FR3 — Replay-Based Evaluation

Research question: can recorded executions become a regression/eval corpus for refinement-mode changes? Promotes Experiment E1/E5 data reuse.

# Direction FR4 — Knowledge Base Retrieval Quality

Research question: how does workspace-scoped semantic retrieval (LanceDB) compare to global retrieval for worker relevance and cost? Tied to Idea I001 and [[04-memory/README]] VectorMemory.

# Direction FR5 — Cross-Device Sync Security

Research question: what is the minimal, auditable end-to-end encryption design for optional sync that preserves local-first guarantees? Open question in the PRD; strategically important for the Plus/Pro tiers ([[MarketResearch-Part03]]).

# Direction FR6 — Marketplace Dynamics

Research question: what governance, ranking, and safety model prevents malicious shared workflows/agents in a community gallery? Tied to Idea I016 and the GTM wedge.

# Related Documents

- [[FutureResearch-Part02]]
- [[Experiments-Part01]]
- [[Ideas-Part01]]
- [[13-roadmap/README]]
- [[04-memory/README]]
