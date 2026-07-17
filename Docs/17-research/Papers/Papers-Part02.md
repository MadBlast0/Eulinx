---
title: Papers Specification - Part 02
status: draft
version: 1.0
tags:
  - research
  - papers
  - refinement
  - verification
related:
  - "[[17-research/README]]"
  - "[[Papers-Part01]]"
  - "[[Papers-Part03]]"
  - "[[10-ai-system/README]]"
---

# Papers Specification (Part 02)

## Document Index

Part 01 - Multi-agent orchestration research (orchestrator-workers, AutoGen, CrewAI, LangGraph)
Part 02 - Self-refinement, reflection, and verification research
Part 03 - Local-first software, privacy, and visual programming research
Part 04 - Synthesis: how the literature maps to Eulinx's mechanisms

# Purpose

This note grounds Eulinx's signature feature — the refinement slider — and its verification model in published results.

# Self-Refine (Madaan et al.)

Self-Refine proposes that a model can iteratively critique and revise its own output. The reported average gain is roughly 20% across tasks when a draft is refined through feedback. This is the direct academic ancestor of Eulinx's refinement loop (see [[10-ai-system/README]]).

Critical nuance: the gain is real but task-dependent. Some tasks a base model cannot solve regardless of loops. Eulinx's UX MUST communicate this honestly (the PRD's risk section) and rely on a judge + stopping rule.

# Refine-n-Judge

Refine-n-Judge extends the idea with a judge model that decides acceptance. Reported preference rates reach up to ~98% when a judge selects the best of several refined candidates. This supports Eulinx's loop mechanics: Generate -> Critic -> Refine -> Judge -> repeat until stop. The judge must be treated as heuristic, not truth (see verification notes in [[10-ai-system/README]]).

# Reflexion — Verbal Reflection On Failure

Reflexion adds a verbal reflection step after failure, persisting lessons to memory. This informs Eulinx's worker memory and replay systems ([[04-memory/README]]): failures should produce artifacts that future workers can learn from, not be discarded.

# Verification: Objective vs Semantic

The literature and practice distinguish objective checks (build, lint, test, type-check) from semantic LLM-judge checks. Objective checks are authoritative; semantic checks are heuristic. Eulinx's Builder/Verifier nodes MUST label judge output as "suggested," not "correct" (PRD risk mitigation). This distinction is a research-backed guardrail, not a stylistic choice.

# Why Cheap Models Benefit Most

Iterative refinement is especially valuable when the generator is a low-cost model: spending a few extra refine passes on a cheap model can approach the quality of a single expensive call at lower total cost. This is the economic core of Eulinx's quality/dollar dial and the reason the product is viable on cheap coding models (see [[10-ai-system/README]]).

# Related Documents

- [[Papers-Part01]]
- [[Papers-Part03]]
- [[Papers-Part04]]
- [[10-ai-system/README]]
- [[04-memory/README]]
