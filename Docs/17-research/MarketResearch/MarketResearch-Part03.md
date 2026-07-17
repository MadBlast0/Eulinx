---
title: MarketResearch Specification - Part 03
status: draft
version: 1.0
tags:
  - research
  - market
  - gtm
  - positioning
related:
  - "[[17-research/README]]"
  - "[[MarketResearch-Part01]]"
  - "[[MarketResearch-Part02]]"
  - "[[CompetitorAnalysis-Part03]]"
---

# MarketResearch Specification (Part 03)

## Document Index

Part 01 - Vision recap, target audience, and the product one-liner
Part 02 - Personas, segmentation, and use-case wedges
Part 03 - Positioning, go-to-market wedge, market size, and non-positioning

# Positioning Statement

Eulinx positions against the "Frankenstein visual builder" and the "single chat assistant" at once. It is the local, visual, multi-agent studio that turns a base model's rough output into refined results — and lets you watch the team do it.

# Go-To-Market Wedge (Fixed)

Do NOT market as "for everyone." Lead with one sharp, defensible wedge, then broaden:

> "Visually orchestrate a team of AI agents on your own machine — and turn a base model's rough output into refined, near-flagship-quality results with one refinement slider. Private, local, no lock-in."

Supporting proof points for the wedge:

- local-first privacy (no code/data leaves the machine except to the user's chosen provider),
- the refinement slider (no incumbent packages iterative self-refinement as a user control),
- live observability of agent work (animated data-flow, per-node logs).

Broaden to tasks/automations/casual users only after the wedge audience is acquired via templates and community.

# Market Size & Trajectory (Fact, Verify Against [[References-Part01]])

The agentic-AI market is described in available reports as growing from roughly $7.6B (2025) to a projected ~$10.8B (2026) and ~$52B by 2030 (~46% CAGR). Multi-agent orchestration is identified as the 2026 trend. These figures are cited from secondary market reports and MUST be re-verified against primary sources before any external use; treat as directional, not authoritative.

# Pricing Psychology (Summary)

Free tier uses BYOK so Eulinx bears no model cost. Paid tiers (Plus/Pro) add concurrency, refinement modes, sync, and hosted credits. The Free→Plus wedge must be compelling without hosted models so acquisition is not margin-negative. Full pricing tables live in the product PRD; this note records only the research basis.

# Non-Positioning (What Eulinx Is Not)

- Not a fork of n8n/Flowise/Langflow (differentiated by living agents, see [[CompetitorAnalysis-Part01]]).
- Not a model trainer or host (orchestrates existing models only).
- Not a required-SaaS product (local-first is the default).
- Not a general no-code app builder (automation is agent-centric).

# Community & Template Strategy

The n8n advantage is largely its template library. Eulinx's growth engine is an official + community template gallery and, later, a marketplace (see [[11-features/README]] and [[13-roadmap/README]]). DevRel should lead with docs and templates as marketing, community-led growth, and narrow-wedge messaging — avoiding hype words.

# Related Documents

- [[MarketResearch-Part01]]
- [[MarketResearch-Part02]]
- [[CompetitorAnalysis-Part01]]
- [[CompetitorAnalysis-Part03]]
- [[13-roadmap/README]]
- [[11-features/README]]
- [[References-Part01]]
