---
title: MarketResearch Specification - Part 02
status: draft
version: 1.0
tags:
  - research
  - market
  - personas
  - segmentation
related:
  - "[[17-research/README]]"
  - "[[MarketResearch-Part01]]"
  - "[[MarketResearch-Part03]]"
  - "[[10-ai-system/README]]"
---

# MarketResearch Specification (Part 02)

## Document Index

Part 01 - Vision recap, target audience, and the product one-liner
Part 02 - Personas, segmentation, and use-case wedges
Part 03 - Positioning, go-to-market wedge, market size, and non-positioning

# Personas In Depth

Personas are design instruments, not demographic profiles. Each drives specific feature priorities.

## Dev Dana (Primary, technical)

- Mental model: terminal + editor + git.
- Hiring Eulinx to do: orchestrated coding across many files, multi-file refactors, PR/commit automation, CI failure diagnosis.
- Must-have: real terminals, refinement on code quality, git panel, artifact verification (build/lint/test).
- Sensitivity: privacy and local-first; dislikes cloud lock-in.
- Design impact: deep controls must be reachable; defaults must not hide power.

## Automator Alex (Secondary, technical-ops)

- Mental model: n8n/Make builder + triggers.
- Hiring Eulinx to do: recurring automations, triggers (file-change, schedule, webhook), logic gates, API/MCP actions.
- Must-have: visual graph, template gallery, MCP capability nodes, human-approval gates.
- Design impact: node graph must support logic/control flow distinctly from data flow (see [[06-workflow-engine/README]]).

## Curious Sam (Tertiary, non-technical)

- Mental model: "pick something and press go."
- Hiring Eulinx to do: summarize, research, generate, automate without understanding agents.
- Must-have: templates, sensible defaults, one-screen onboarding, calm UI.
- Design impact: advanced controls layered, not forced; templates are the entry point.

# Segmentation By Capability Need

Segments can also be sliced by which Eulinx capability they value:

- Quality-seekers — want the refinement slider and will tolerate higher token cost.
- Privacy-seekers — want local-first and BYOK above all.
- Productivity-seekers — want multi-agent parallelism to finish faster.
- Builder-seekers — want the graph and templates to compose systems.

These overlap; the roadmap should not force a single segment but should weight the wedge (quality + privacy + productivity for Dana/Alex).

# Use-Case Wedges

Concrete entry use-cases that demonstrate value in under five minutes:

- "Refine my spec/code with a cheap model until it's clean" (quality wedge).
- "Spawn a team to build a small app while I watch" (productivity + observability wedge).
- "Automate this folder: on change, run agent + lint + commit" (automation wedge).

Each wedge maps to a roadmap milestone in [[13-roadmap/README]].

# Related Documents

- [[MarketResearch-Part01]]
- [[MarketResearch-Part03]]
- [[10-ai-system/README]]
- [[06-workflow-engine/README]]
- [[13-roadmap/README]]
