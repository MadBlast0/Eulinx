---
title: Automations Specification - Part 03
status: draft
version: 1.0
tags:
  - features
  - automations
related:
  - "[[Automations-Part02]]"
  - "[[Automations-Part04]]"
  - "[[LoopNodes-Part01]]"
---

# Automations Specification (Part 03)

## Document Index

Part 01 - Purpose, Scope, and the Automation Model
Part 02 - Triggers and Actions
Part 03 - AI-Native Nodes and Logic Gates
Part 04 - Scheduled and Recurring Execution
Part 05 - Templates, Safety, and AI Notes

# AI-Native Nodes

An AI node is a step that is itself an agent. It receives the upstream payload plus selected context, may spawn sub-agents (hierarchical fan-out), and produces an output Artifact. Refinement applies: an AI node can carry a Low/Medium/High/Ultra mode, and the loop runs before the node resolves.

# Logic Gates

Logic-gate nodes route data based on conditions or agent outputs:

- if / AND / OR / NOR
- later: switch, threshold

Gates enable branching workflows and "loop until condition met". A gate consumes control flow and emits control flow plus possibly a filtered data flow.

# Builder and Verifier Nodes

A builder node implements a result (e.g., writes code as an Artifact). A verifier node runs objective checks (build, lint, test, type-check). On failure, the flow can route back to a worker for a fix, closing the agentic loop. Semantic verification via an LLM-judge node is treated as heuristic and labeled "suggested".

# Related Documents

- [[Automations-Part04]]
- [[LoopNodes-Part01]]
