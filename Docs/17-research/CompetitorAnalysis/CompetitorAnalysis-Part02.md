---
title: CompetitorAnalysis Specification - Part 02
status: draft
version: 1.0
tags:
  - research
  - competitors
  - agents
  - coding
related:
  - "[[17-research/README]]"
  - "[[CompetitorAnalysis-Part01]]"
  - "[[CompetitorAnalysis-Part03]]"
  - "[[Papers-Part01]]"
---

# CompetitorAnalysis Specification (Part 02)

## Document Index

Part 01 - Method, axes of comparison, and the n8n / Flowise / Langflow cluster
Part 02 - AI coding & agent platforms: Cursor, Claude Code, AutoGen, CrewAI, LangGraph
Part 03 - Local-first & infrastructure-adjacent: Ollama, Home Assistant, Docker Desktop, managed agent platforms

# AI Coding Tools: Cursor and Claude Code

Cursor and Claude Code are the closest "worker terminal" analogues to Eulinx's individual workers. They run an AI inside a real coding environment on the user's project.

Where they differ from Eulinx:

- They are single-agent by default. One assistant, one context, one conversation. The user is the orchestrator.
- They have no visual multi-worker graph. You cannot watch ten coding agents negotiate phases on a canvas.
- They do not spawn sub-agents hierarchically; if they do (some CLIs spawn helpers), it is hidden, not visualized.
- Refinement is implicit (you ask again) rather than a system-level control.

Eulinx's relationship to these tools is partly symbiotic, not purely competitive. Many Eulinx workers will run these very CLIs (e.g. an opencode or Claude Code terminal) as their execution environment. Eulinx is the operating system; Cursor/Claude Code are tenants. This is why the architecture keeps the terminal as a generic execution surface rather than a hardcoded agent (see worker notes in [[03-worker-system/README]]).

# Multi-Agent Frameworks: AutoGen, CrewAI, LangGraph

These are the closest architectural cousins to Eulinx's AI layer, and the most important competitive reference.

AutoGen (Microsoft) provides conversation-based multi-agent patterns, notably GroupChat, where several agents discuss a problem. CrewAI provides role-based agent teams with defined jobs. LangGraph provides a deterministic graph of nodes with explicit state and memory, closer to a programmable workflow than a free conversation.

What they prove:

- Multi-agent systems outperform single agents on hard tasks. Anthropic's own research system scored roughly +90% over a single agent (at ~15x token cost) — see [[Papers-Part01]].
- Deterministic graphs (LangGraph) are more reliable and debuggable than free conversation (early AutoGen).

What they lack for Eulinx's audience:

- They are code-only / dev-only. No visual canvas, no terminal, no local desktop shell.
- They do not isolate context per worker via workspaces and sandboxes the way Eulinx does (see [[04-memory/README]]).
- They are cloud-optional at best and frequently assume hosted model APIs.
- They do not expose refinement or observability as product features for non-engineers.

Strategic lesson: Eulinx should adopt LangGraph's determinism and AutoGen/CrewAI's collaboration patterns, then wrap them in a local, visual, terminal-native shell that none of them provide.

# Managed Agent Platforms

Hosted "agent OS" and managed orchestration services exist but contradict Eulinx's local-first, BYOK, no-lock-in thesis. They are competitors only in the sense that they occupy adjacent mindshare; Eulinx's wedge is explicit privacy and control (see [[MarketResearch-Part03]]).

# Summary Table (Prose Form)

The local-first, visual, multi-terminal, refinement-controlled, artifact-driven combination is not occupied by any single competitor. Automation builders have the visual graph but not living agents; coding tools have the terminal but not the graph; agent frameworks have the multi-agent logic but not the desktop shell; managed platforms have convenience but not privacy.

# Related Documents

- [[CompetitorAnalysis-Part01]]
- [[CompetitorAnalysis-Part03]]
- [[Papers-Part01]]
- [[03-worker-system/README]]
- [[10-ai-system/README]]
