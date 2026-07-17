---
title: ProjectOverview - Part 02
status: draft
version: 1.0
tags:
  - ai-context
  - project-overview
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/ProjectOverview/ProjectOverview-Part01]]"
  - "[[01-core-concepts/README]]"
---

# ProjectOverview (Part 02) — Product Shape and Non-Negotiables

## Document Index

Part 01 - What Eulinx is, the problem, the users
Part 02 - Product shape, positioning, and non-negotiables

## Product shape

- **Three-pane layout (default):** left sidebar (navigation: Graph, Terminals, Files, Git, Plugins, Settings); center canvas (the node-graph workspace with agents, terminals, tools, and data flowing between them); right sidebar (context: file tree, agent/terminal session history, workspace/project/cross-project history, git panel, and later a browser panel).
- **The agent = a terminal.** Every Worker is backed by a real terminal process (Rust PTY). A node on the canvas is a visual handle to that Worker. Minimized → a compact chip showing name + running process + status dot. Maximized → full terminal with streaming I/O.
- **Workspace = a project folder.** The user selects a local folder; Eulinx creates an isolated workspace scoped to that folder. Features operate on that project only. Multiple independent projects can exist.
- **Animated observability.** While a node works, an animated packet travels along its outgoing edges to the next node; edges glow; the node shows status (idle/working/done/error). This is the core differentiator against "Frankenstein" visual builders.

## Positioning one-liner

> Eulinx is a local-first desktop workspace where you visually orchestrate a team of AI agents — each in its own terminal on a node-graph canvas — and turn base-model output into refined, higher-quality results with a single refinement slider. Private by default, no vendor lock-in, deep enough for engineers, simple enough for anyone.

## Core differentiators

1. Visual multi-agent orchestration, local-first.
2. The refinement slider (Low → Ultra).
3. Live, animated data-flow = observability and explainability.
4. Real terminals as agents (Rust PTY), so work is real, not simulated.
5. MCP as a settings surface to grant capabilities by reusing the open MCP ecosystem.
6. Privacy and no lock-in: everything on-device, BYOK, graphs export as JSON.

## Non-negotiables

- Local-first and private by default. Only outbound traffic is to the model provider the user configures.
- Workers MUST NOT directly mutate the project. They produce Artifacts; a deterministic Merge Manager applies verified patches.
- Rust MUST remain a thin native bridge (≈5%). Business logic stays in TypeScript.
- The coding model is cheap; tasks MUST be small, verifiable, and dependency-ordered.
- Specification docs are prose-only; no code in the plans.

## Related Documents

- [[99-ai-context/ProjectOverview/ProjectOverview-Part01]]
- [[07-ui-ux/README]]
- [[01-core-concepts/README]]
- [[10-ai-system/README]]
