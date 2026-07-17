---
title: Experiments Specification - Part 02
status: draft
version: 1.0
tags:
  - research
  - experiments
  - scalability
  - ux
related:
  - "[[17-research/README]]"
  - "[[Experiments-Part01]]"
  - "[[07-ui-ux/README]]"
---

# Experiments Specification (Part 02)

## Document Index

Part 01 - Validation experiments (refinement gain, context isolation cost, merge conflicts)
Part 02 - Scalability & UX experiments (terminal density, observability trust, budget behavior)

# Purpose

This note continues the experiment log with scalability and UX hypotheses that affect the UI/UX layer ([[07-ui-ux/README]]) and the runtime limits encoded in the scheduler and budgets.

# Experiment E4 — Terminal Density Limit

- Hypothesis: a single user can effectively monitor and manage a bounded number of live worker terminals before cognitive overload; chip/compact modes extend that bound.
- Method: usability sessions with 10 / 50 / 100 workers in full vs compact vs chip views; measure time-to-correct and perceived control.
- Decision rule: informs the default max visible terminals and the auto-collapse behavior in the canvas.
- Grounded in: the three-level terminal view (full/compact/chip) from the product discussion.

# Experiment E5 — Observability Trust

- Hypothesis: animated data-flow + per-node logs increase user trust and speed of correction versus static status dots.
- Method: A/B the graph with and without packet animation; measure false-correction rate and time-to-intervene on a seeded failure.
- Decision rule: if animation does not improve correction speed, demote it from default-on to opt-in.
- Grounded in: [[Papers-Part03]] (visual comprehension) and [[07-ui-ux/README]] animation spec.

# Experiment E6 — Budget Behavior

- Hypothesis: visible per-run cost estimates and pre-run Ultra warnings change user behavior toward sustainable spend without blocking adoption.
- Method: instrument cost display; measure mode selection and budget-overrun incidents.
- Decision rule: informs whether Ultra requires explicit confirmation (PRD risk mitigation).

# Logging Rules

Experiments MUST record: hypothesis, method, metrics, decision rule, status, and result link. Results that contradict a spec MUST trigger a spec review, not silent abandonment. Negative results are first-class; they prevent over-building.

# Related Documents

- [[Experiments-Part01]]
- [[07-ui-ux/README]]
- [[02-runtime/README]]
- [[Papers-Part03]]
