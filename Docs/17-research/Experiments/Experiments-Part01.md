---
title: Experiments Specification - Part 01
status: draft
version: 1.0
tags:
  - research
  - experiments
  - validation
related:
  - "[[17-research/README]]"
  - "[[Experiments-Part02]]"
  - "[[Papers-Part04]]"
  - "[[FutureResearch-Part01]]"
---

# Experiments Specification (Part 01)

## Document Index

Part 01 - Validation experiments (refinement gain, context isolation cost, merge conflicts)
Part 02 - Scalability & UX experiments (terminal density, observability trust, budget behavior)

# Purpose

Experiments are the bridge between the literature ([[17-research/Papers/Papers-Part01]]) and Eulinx's specifications. They record hypotheses we must test before locking numbers into specs or the roadmap ([[13-roadmap/README]]). Each experiment is a hypothesis, a method, and a decision rule.

# Experiment E1 — Refinement Gain On Cheap Models (Coding)

- Hypothesis: applying Low->Ultra refinement to a cheap model on coding tasks yields measurable quality gain approaching an expensive single call at lower total cost.
- Method: take a benchmark suite (to be selected, see `REF-013`); run base model draft, then 1/2/4/8 refine passes; score with objective (build/lint/test) + judge.
- Decision rule: if Ultra shows <10% objective gain over Low at >5x cost, default max mode drops to High and UX warns harder.
- Grounded in: [[Papers-Part02]] (Self-Refine ~20%).

# Experiment E2 — Context Isolation Cost

- Hypothesis: per-orchestrator context isolation reduces token cost and improves worker reliability versus shared history.
- Method: same multi-phase task with isolated vs shared context; measure tokens, failure rate, completion time.
- Decision rule: if isolation saves <15% tokens, simplify the memory bus ([[04-memory/README]]).
- Grounded in: [[Papers-Part03]] (context isolation research).

# Experiment E3 — Parallel Worker Merge Conflict Rate

- Hypothesis: sandboxed per-worker edits merged via Merge Manager produce an acceptable conflict rate at scale.
- Method: N workers edit disjoint symbols of a generated project; measure conflicts, auto-merge success, manual-merge need.
- Decision rule: if manual-merge rate exceeds a threshold at N workers, tighten Lock Manager symbol-level locks ([[02-runtime/README]]).
- Grounded in: the merge/sandbox design from the product discussion and [[05-artifacts/README]].

# Status Convention

Each experiment records status: `planned`, `running`, `done`, `superseded`. None are `done` at draft time; this folder is a log to be filled during build.

# Related Documents

- [[Experiments-Part02]]
- [[Papers-Part04]]
- [[FutureResearch-Part01]]
- [[04-memory/README]]
- [[02-runtime/README]]
