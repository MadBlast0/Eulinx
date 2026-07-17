---
title: Papers Specification - Part 04
status: draft
version: 1.0
tags:
  - research
  - papers
  - synthesis
related:
  - "[[17-research/README]]"
  - "[[Papers-Part01]]"
  - "[[Papers-Part02]]"
  - "[[Papers-Part03]]"
---

# Papers Specification (Part 04)

## Document Index

Part 01 - Multi-agent orchestration research (orchestrator-workers, AutoGen, CrewAI, LangGraph)
Part 02 - Self-refinement, reflection, and verification research
Part 03 - Local-first software, privacy, and visual programming research
Part 04 - Synthesis: how the literature maps to Eulinx's mechanisms

# Purpose

This note maps the literature in Parts 01-03 onto Eulinx's concrete mechanisms so specifications can cite a single source of truth.

# Mechanism Map

- Multi-agent outperformance (Part 01) -> Root/Phase/Task Orchestrators + Workers ([[03-worker-system/README]]).
- Orchestrator-workers +90% / 15x (Part 01) -> budgets, concurrency limits, visible cost estimates ([[10-ai-system/README]]).
- LangGraph determinism (Part 01) -> executable graph state ([[06-workflow-engine/README]]).
- Self-Refine ~20% (Part 02) -> refinement slider Low/Medium/High/Ultra ([[10-ai-system/README]]).
- Refine-n-Judge ~98% (Part 02) -> Judge step + stopping rule in the loop.
- Reflexion (Part 02) -> worker memory + replay capture failures ([[04-memory/README]]).
- Objective vs semantic verification (Part 02) -> Builder/Verifier nodes; judge labeled "suggested."
- Local-first (Part 03) -> default-local architecture, BYOK, export ([[MarketResearch-Part03]]).
- Visual programming comprehension (Part 03) -> live nodes, artifact edges, animated flow ([[07-ui-ux/README]]).
- Context isolation (Part 03) -> memory bus selective injection ([[04-memory/README]]).

# What The Literature Does NOT Prove

The literature does NOT prove that refinement equals a flagship model, that multi-agent is always worth 15x cost, or that visual graphs automatically improve outcomes. Eulinx's specs MUST respect these limits: honest UX language, budgets, and tunable modes (PRD risks).

# Open Empirical Questions

These are carried into [[Experiments-Part01]] and [[FutureResearch-Part01]]:

- What is the real quality gain of refinement on cheap models for coding tasks?
- At what worker count does coordination overhead negate parallelism?
- What merge-conflict rate arises from parallel sandboxed workers?
- Does animated observability measurably improve user trust/correction speed?

# Related Documents

- [[Papers-Part01]]
- [[Papers-Part02]]
- [[Papers-Part03]]
- [[Experiments-Part01]]
- [[FutureResearch-Part01]]
- [[10-ai-system/README]]
