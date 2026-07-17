---
title: Verifier Specification - Part 01
status: draft
version: 1.0
tags:
  - ai-system
  - verifier
related:
  - "[[10-ai-system/README]]"
  - "[[Verifier-Part02]]"
---

# Verifier Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, and Objective Checks
Part 02 - Verification Report and Checks
Part 03 - Semantic Verification and Labeling
Part 04 - Implementation Checklist and Future Expansion

# Purpose

The Verifier checks an artifact objectively. It runs deterministic gates such as build, lint, tests, and type-check, and produces a verification report. It MAY also run an optional semantic LLM check, but that check is labeled "suggested," not truth.

# Philosophy

Objective verification is the reliable part of quality control. A cheap model can be wrong; a compiler and a test suite are not. The Verifier is what makes the refinement loop trustworthy.

# Objective Checks

The Verifier runs checks appropriate to the artifact type:

- Code: build, lint, type-check, unit tests.
- JSON: schema validation and parse check.
- Patch: applies cleanly, no conflict, no protected-path violation.
- Markdown/Plan: structure and checklist completeness checks.

# Relation to Merge

Only artifacts that pass required objective checks proceed toward the Judge and Merge Manager. Failed checks are attached as feedback so the Builder can fix them.

# Related Documents

- [[Verifier-Part02]]
- [[RefinementLoop-Part03]]
- [[Builder-Part01]]
- [[02-runtime/MergeManager/MergeManager-Part01]]
