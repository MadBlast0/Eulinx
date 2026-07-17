---
title: Verifier Specification - Part 02
status: draft
version: 1.0
tags:
  - ai-system
  - verifier
  - report
related:
  - "[[Verifier-Part01]]"
  - "[[Verifier-Part03]]"
---

# Verifier Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and Objective Checks
Part 02 - Verification Report and Checks
Part 03 - Semantic Verification and Labeling
Part 04 - Implementation Checklist and Future Expansion

# Verification Report

The Verifier returns a structured report. Suggested fields:

- checks: list of each check with name, status (pass/fail/skip), and detail.
- summary: overall pass/fail against required checks.
- artifacts affected: which files or artifacts were inspected.
- logs: relevant output excerpts for debugging.

# Required vs Optional

Some checks are required (build must pass). Others are optional (a style lint warning). The report MUST distinguish them so the Judge can enforce hard gates without over-rejecting.

# Running Environment

Checks run in the worker's sandbox or via the runtime, never directly on the user's live workspace unless explicitly permitted. The Verifier reports; it does not apply changes.

# Related Documents

- [[Verifier-Part01]]
- [[Judge-Part02]]
- [[Builder-Part02]]
