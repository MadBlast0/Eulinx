---
title: Papers Specification - Part 01
status: draft
version: 1.0
tags:
  - research
  - papers
  - multi-agent
related:
  - "[[17-research/README]]"
  - "[[Papers-Part02]]"
  - "[[10-ai-system/README]]"
  - "[[References-Part01]]"
---

# Papers Specification (Part 01)

## Document Index

Part 01 - Multi-agent orchestration research (orchestrator-workers, AutoGen, CrewAI, LangGraph)
Part 02 - Self-refinement, reflection, and verification research
Part 03 - Local-first software, privacy, and visual programming research
Part 04 - Synthesis: how the literature maps to Eulinx's mechanisms

# Purpose

This note summarizes the research that grounds Eulinx's core AI claims: that multi-agent systems outperform single agents, and that the orchestrator-workers pattern is the right default topology.

# Orchestrator-Workers (Anthropic Pattern)

Anthropic's published agentic pattern describes an orchestrator model that breaks a task into subtasks, delegates to worker models, and synthesizes results. Eulinx adopts this as its primary topology: a Root Orchestrator spawns Phase and Task Orchestrators, which spawn Workers (see [[03-worker-system/README]]). The key research-backed benefits are decomposition, parallel exploration, criticism, and verification — things a single context cannot do well.

Reported result (from the cited industry research, verify in [[References-Part01]]): an orchestrator-workers research system scored roughly +90% over a single agent, at approximately 15x token cost. This is the central trade-off Eulinx manages via budgets and concurrency limits.

# AutoGen (Microsoft) — Conversational Multi-Agent

AutoGen demonstrates multi-agent conversation, notably GroupChat, where several agents deliberate. It proves collaborative problem-solving but is code-only and free-form, which hurts debuggability. Eulinx borrows the collaboration idea but imposes deterministic structure and visual representation.

# CrewAI — Role-Based Teams

CrewAI shows that assigning roles and a shared goal to a team of agents produces coordinated behavior. Eulinx generalizes this: workers are generic; the prompt/role is supplied at spawn time, avoiding hardcoded "Researcher/Planner" agents (see worker notes in [[03-worker-system/README]]).

# LangGraph — Deterministic Graphs

LangGraph provides explicit graph state and memory, making agent flows programmable and debuggable. Eulinx's workflow engine ([[06-workflow-engine/README]]) inherits the determinism principle: the graph is executable state, not a chat transcript.

# Implication For Eulinx

The literature converges on: multi-agent helps, structure helps more than free conversation, and orchestration should be explicit. Eulinx's differentiator is making that explicit orchestration visual, local, and terminal-backed.

# Related Documents

- [[Papers-Part02]]
- [[Papers-Part03]]
- [[Papers-Part04]]
- [[10-ai-system/README]]
- [[03-worker-system/README]]
- [[06-workflow-engine/README]]
