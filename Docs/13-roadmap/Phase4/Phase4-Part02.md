---
title: Phase4 Specification - Part 02
status: draft
version: 1.0
tags:
  - roadmap
  - phase4
  - workflow
  - cli
  - ui
related:
  - "[[Phase4-Part01]]"
  - "[[Phase4-Part03]]"
---

# Phase4 Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and Orchestrators
Part 02 - Workflow Engine, CLI, and UI
Part 03 - Observability, Completion, and Product Readiness

# Workflow Engine

The Workflow Engine executes node graphs as DAGs. It handles dependencies, branches, parallelism, human approval gates, retry, resume, checkpoints, and templates.

Node types (see [[06-workflow-engine/README]]): worker/terminal nodes, tool nodes, logic-gate nodes (if/AND/OR/NOR, switch, threshold), I/O nodes, builder/verifier nodes, artifact nodes, memory nodes, MCP nodes, human-approval nodes, delay nodes.

Edges carry data flow (payloads) and control flow (gate decisions) with distinct styles. Animation: packets travel edges while nodes work; edges glow; nodes show status.

The engine is the user-facing canvas for automations and the visualization of orchestrator-spawned graphs.

# CLI

The Eulinx CLI exposes the engine headless: init, doctor, runtime, scheduler, spawn, worker, session, memory, artifact, provider, workflow, prompt, tool, config, plugin, update.

The CLI lets automation, CI, and power users drive Eulinx without the desktop shell, and lets the same primitives be scripted.

# UI

The UI is the desktop studio. It realizes the three-pane layout (left nav, center canvas, right context) from [[07-ui-ux/README]].

Surfaces: dashboard, runtime monitor, worker explorer, session viewer, memory browser, artifact browser, prompt inspector, workflow designer, logs, metrics, cost dashboard, settings.

Worker terminals minimize to chips, compact to status cards, maximize to full xterm.js. The refinement UI shows per-worker mode (Low/Med/High/Ultra) + pass counter + cost estimate.

The UI contains NO business logic; it reads state and emits intents through services. See [[12-development/README]].

# Related Documents

- [[Phase4-Part03]]
- [[Phase4-Part01]]
- [[06-workflow-engine/README]]
- [[07-ui-ux/README]]
