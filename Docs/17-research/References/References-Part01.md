---
title: References Specification - Part 01
status: draft
version: 1.0
tags:
  - research
  - references
  - sources
related:
  - "[[17-research/README]]"
  - "[[References-Part02]]"
  - "[[Papers-Part01]]"
---

# References Specification (Part 01)

## Document Index

Part 01 - Core reference catalog (reports, papers, organizations)
Part 02 - Datasets, standards, tools, and citation conventions

# Purpose

This note is the indexed catalog of external sources cited across the Eulinx vault. It exists so any claim in [[17-research/CompetitorAnalysis/CompetitorAnalysis-Part01]], [[17-research/MarketResearch/MarketResearch-Part01]], or [[17-research/Papers/Papers-Part01]] can be traced to a source, and so future research can extend the vault without duplicating entries.

# Reference Catalog (Prose Index)

Each entry lists: identifier, type, what it covers, and where it is used in the vault.

- `REF-001` — Agentic Coding Industry Report (2026). Covers developer AI-adoption rates (~60% of work, 0-20% fully delegated) and the shift to orchestrating agents. Used in [[Papers-Part01]] and [[MarketResearch-Part01]].
- `REF-002` — Orchestrator-Workers Research System Writeup. Reports +90% over single agent at ~15x tokens. Used in [[Papers-Part01]] and [[10-ai-system/README]].
- `REF-003` — Self-Refine (Madaan et al.). Iterative critique/refine; ~20% avg gain. Used in [[Papers-Part02]].
- `REF-004` — Refine-n-Judge. Judge-selected refinement; up to ~98% preference. Used in [[Papers-Part02]].
- `REF-005` — Reflexion. Verbal reflection on failure, persisted memory. Used in [[Papers-Part02]] and [[04-memory/README]].
- `REF-006` — Local-First Software essay/manifesto. User ownership, offline, no mandatory server. Used in [[Papers-Part03]] and [[MarketResearch-Part03]].
- `REF-007` — Agentic-AI Market Sizing Report(s). ~$7.6B (2025) -> ~$10.8B (2026) -> ~$52B (2030), ~46% CAGR. Used in [[MarketResearch-Part03]]; flagged verify.
- `REF-008` — Visual Programming comprehension studies. Graphs aid debugging when they represent real state. Used in [[Papers-Part03]] and [[07-ui-ux/README]].
- `REF-009` — AutoGen documentation/paper. Conversational multi-agent, GroupChat. Used in [[Papers-Part01]] and [[CompetitorAnalysis-Part02]].
- `REF-010` — CrewAI documentation/paper. Role-based agent teams. Used in [[Papers-Part01]].
- `REF-011` — LangGraph documentation/paper. Deterministic agent graphs + memory. Used in [[Papers-Part01]] and [[06-workflow-engine/README]].
- `REF-012` — n8n / Flowise / Langflow docs. Visual automation/LLM builders. Used in [[CompetitorAnalysis-Part01]].

# Handling Unverified Figures

`REF-007` market sizes are from secondary reports and MUST be re-verified against primary sources before external publication. Until then, all vault uses mark them as directional. The same discipline applies to any statistic a cheap coding model might otherwise treat as fixed.

# Related Documents

- [[References-Part02]]
- [[Papers-Part01]]
- [[MarketResearch-Part03]]
- [[CompetitorAnalysis-Part01]]
