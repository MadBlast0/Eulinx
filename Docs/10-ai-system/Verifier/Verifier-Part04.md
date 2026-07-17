---
title: Verifier Specification - Part 04
status: draft
version: 1.0
tags:
  - ai-system
  - verifier
  - implementation
related:
  - "[[Verifier-Part03]]"
---

# Verifier Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, and Objective Checks
Part 02 - Verification Report and Checks
Part 03 - Semantic Verification and Labeling
Part 04 - Implementation Checklist and Future Expansion

# Implementation Checklist

1. Define check registry per artifact type.
2. Run required objective checks in sandbox.
3. Optionally run semantic LLM check, labeled suggested.
4. Produce structured verification report.
5. Attach report to artifact metadata.
6. Emit verification event to the `EventBus`.

# Future Expansion

- Cached verification for unchanged artifacts.
- Parallel check execution.
- Project-specific check suites configured per workspace.
- Verification that blocks only on policy-flagged checks.

# AI Notes

Do not let the Verifier apply changes. It reports; the Merge Manager applies.

Do not treat semantic checks as truth. Label them suggested.

Do not skip objective checks for speed. They are the reliable half of quality control.

# Related Documents

- [[Verifier-Part01]]
- [[RefinementLoop-Part03]]
- [[Judge-Part02]]
