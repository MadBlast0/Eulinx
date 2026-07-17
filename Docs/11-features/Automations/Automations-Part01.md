---
title: Automations Specification - Part 01
status: draft
version: 1.0
tags:
  - features
  - automations
related:
  - "[[11-features/README]]"
  - "[[Automations-Part02]]"
  - "[[WorkflowEngine-Part01]]"
---

# Automations Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and the Automation Model
Part 02 - Triggers and Actions
Part 03 - AI-Native Nodes and Logic Gates
Part 04 - Scheduled and Recurring Execution
Part 05 - Templates, Safety, and AI Notes

# Purpose

The Automations feature is Eulinx's n8n territory, made AI-native. It lets users compose visual graphs of triggers, AI nodes, actions, and logic gates that run automatically — without the "Frankenstein" complexity of bolting AI onto a generic builder.

An automation is a Workflow owned by the active workspace. The node graph is the automation surface; animated data-flow packets are its observability.

# Scope

Automations are project-scoped. A trigger watching a file watches the workspace folder. An action writing a file writes within the workspace unless explicitly granted broader scope.

# The Automation Model

An automation is a graph:

- trigger nodes (entry points)
- AI nodes (agent steps that may spawn sub-agents)
- action nodes (run command, call API/MCP, write file, send message)
- logic-gate nodes (if / AND / OR / NOR / switch / threshold)
- edges carrying data flow and control flow (distinct styles)

# What Automations Owns

The automation feature owns:

- the trigger registry and trigger UI
- the action node catalog
- the scheduling and recurrence of automations
- the run history and live state of each automation

It does NOT own the graph rendering engine (UI), the execution kernel (Runtime), or verification (Verifier). It composes them.

# Related Documents

- [[Automations-Part02]]
- [[WorkflowEngine-Part01]]
