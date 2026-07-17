---
title: ProjectOverview - Part 01
status: draft
version: 1.0
tags:
  - ai-context
  - project-overview
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/ProjectOverview/ProjectOverview-Part02]]"
  - "[[00-introduction/README]]"
  - "[[01-core-concepts/README]]"
---

# ProjectOverview (Part 01) — What Eulinx Is

## Document Index

Part 01 - What Eulinx is, the problem, the users
Part 02 - Product shape, positioning, and non-negotiables

## What Eulinx is

Eulinx is a local-first desktop workspace that visualizes and orchestrates a team of AI Workers (each running in its own terminal) on a node-graph canvas. The user points Eulinx at a project folder and gets an isolated workspace where a visual team of AI workers does real work — coding, automating, and completing tasks — while the user watches the work happen as a living, animated graph.

The center of the product is the **Worker**, not the chat. A Worker is literally a running AI terminal: it receives a task, runs CLIs (for example a coding-agent CLI such as Claude Code, OpenCode, or Codex), produces an **Artifact**, and reports back. Workers can spawn more workers, forming a hierarchy of orchestrators and sub-workers that mirrors how a software organization is structured.

Eulinx is **not** a chatbot, not a workflow builder, not a coding assistant, and not an automation platform in isolation. Those are features. The actual product is closer to an **operating system for AI work**: the user manages an organization of workers, each with its own role, memory, terminal, context, tools, and communication channels.

## The problem Eulinx solves

Single agents plateau. A single chat cannot decompose, parallelize, criticize, and verify hard problems well. Multi-agent systems are proven to outperform single agents, but today they are either code-only (hard for normals) or cloud-locked (privacy and lock-in). Visual builders bolt AI on as one node type and have weak observability. Eulinx answers with: orchestrator-workers made visual and local; animated data-flow for observability; a refinement slider to upgrade base-model output; and on-device, bring-your-own-key operation with exportable graphs.

## The users

- Primary (wedge): developers, engineers, and automators who want local, private, multi-agent orchestration with a quality-upgrade control.
- Secondary: technical operators / indie hackers who build automations (the n8n/Make audience) but want AI-native flows and no lock-in.
- Tertiary (later): casual users who run shared/community templates to "just get something done."

## The signature feature: the Refinement Loop

A user-facing control (Low / Medium / High / Ultra) that sets how many critique→refine passes an output undergoes before acceptance. It upgrades the output of a base or low-intelligence model into refined, higher-quality results via iteration. It works with any connected model (BYOK), cheap or flagship. Guardrails MUST exist: a stopping rule (judge or max iterations), a token/cost budget per run, and honest UX that never claims to magically equal a flagship model.

## Related Documents

- [[99-ai-context/ProjectOverview/ProjectOverview-Part02]]
- [[00-introduction/README]]
- [[01-core-concepts/README]]
- [[10-ai-system/README]]
