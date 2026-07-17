---
title: FutureResearch Specification - Part 02
status: draft
version: 1.0
tags:
  - research
  - future
  - evaluation
  - security
related:
  - "[[17-research/README]]"
  - "[[FutureResearch-Part01]]"
  - "[[Papers-Part04]]"
---

# FutureResearch Specification (Part 02)

## Document Index

Part 01 - Strategic unknowns & capability-gap research directions
Part 02 - Evaluation, security, and ecosystem research directions

# Purpose

This note continues the future-research directions with evaluation methodology, security, and ecosystem-scale questions that the v1 specifications deliberately defer.

# Direction FR7 — Refinement Equivalence Bounds

Research question: for which task classes does iterative refinement on cheap models asymptotically approach flagship quality, and where does it provably fail? Direct continuation of [[Papers-Part02]] and Experiment E1. Honest UX language depends on the answer.

# Direction FR8 — Coordination Overhead Threshold

Research question: at what worker count does multi-agent coordination overhead negate the parallelism gain (the ~15x cost from `REF-002` made explicit)? Informs scheduler caps and the auto-spawn ceiling.

# Direction FR9 — Verifier Trust Calibration

Research question: how should semantic (LLM-judge) verification confidence be calibrated and surfaced so users do not over-trust "suggested" results? Continues the objective-vs-semantic distinction in [[Papers-Part02]].

# Direction FR10 — Permission Surface Minimization

Research question: what is the smallest permission vocabulary that covers real agent actions while remaining comprehensible to non-technical users? Tied to the permission model ([[02-runtime/README]] PermissionManager) and Curious Sam persona ([[MarketResearch-Part02]]).

# Direction FR11 — Local Model Suitability

Research question: which local models (via Ollama/LM Studio) are viable generators vs critics in the refinement loop, and how does that shift the offline story? Tied to [[CompetitorAnalysis-Part03]] and BYOK.

# Direction FR12 — Ecosystem Standard Tracking

Research question: which emerging standards (beyond MCP, `REF-015`) should Eulinx track for capability nodes, agent interchange, and artifact portability? Keeps the plugin/MCP layer future-proof.

# Closure Rule

A future-research direction closes when it is either (a) answered and promoted into a spec, or (b) explicitly retired with rationale. The vault MUST keep a pointer from the retired direction to the decision that closed it.

# Related Documents

- [[FutureResearch-Part01]]
- [[Papers-Part02]]
- [[Papers-Part04]]
- [[Experiments-Part01]]
- [[02-runtime/README]]
