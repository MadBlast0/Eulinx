---
title: Papers Specification - Part 03
status: draft
version: 1.0
tags:
  - research
  - papers
  - local-first
  - visualization
related:
  - "[[17-research/README]]"
  - "[[Papers-Part01]]"
  - "[[Papers-Part02]]"
  - "[[CompetitorAnalysis-Part03]]"
---

# Papers Specification (Part 03)

## Document Index

Part 01 - Multi-agent orchestration research (orchestrator-workers, AutoGen, CrewAI, LangGraph)
Part 02 - Self-refinement, reflection, and verification research
Part 03 - Local-first software, privacy, and visual programming research
Part 04 - Synthesis: how the literature maps to Eulinx's mechanisms

# Purpose

This note grounds the non-AI research that justifies Eulinx's local-first stance, its privacy model, and its bet on visual programming for orchestration.

# Local-First Software

The local-first software movement argues that apps should prioritize user ownership of data, offline capability, and absence of mandatory servers. Eulinx's default-local architecture (BYOK, on-device graphs, optional sync) is a direct application. Local-first wins on privacy and control, which is precisely Eulinx's wedge against managed agent platforms (see [[CompetitorAnalysis-Part03]]).

# Privacy & Lock-In Research

Studies of user trust show that perceived data control strongly influences adoption of AI tools. Cloud tools that send code/data to third parties create reluctance, especially for proprietary work. Eulinx's answers — on-device execution, BYOK, JSON graph export, portable templates — are evidence-based mitigations.

# Visual Programming & Program Comprehension

Decades of visual programming research show that graphs aid comprehension and debugging when they represent real execution state, but become "Frankenstein" when they merely wrap opaque nodes. Eulinx's design rule: nodes are live worker terminals and deterministic runtime services, and edges carry artifacts, not opaque JSON (see [[06-workflow-engine/README]]). Animated data-flow is an observability device, not decoration (see [[07-ui-ux/README]]).

# Context Window & Isolation Research

Research on context limits shows that isolating relevant context per worker improves reliability and reduces cost versus dumping shared history. This validates Eulinx's memory bus with selective injection and per-orchestrator context isolation ([[04-memory/README]]). The "CEO asks 'is auth done?' not 'did you write line 24?'" analogy from the product discussion is the practical expression of this literature.

# Related Documents

- [[Papers-Part01]]
- [[Papers-Part02]]
- [[Papers-Part04]]
- [[CompetitorAnalysis-Part03]]
- [[04-memory/README]]
- [[06-workflow-engine/README]]
- [[07-ui-ux/README]]
