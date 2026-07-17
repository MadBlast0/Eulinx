---
title: Critic Specification - Part 02
status: draft
version: 1.0
tags:
  - ai-system
  - critic
related:
  - "[[Critic-Part01]]"
  - "[[Critic-Part03]]"
---

# Critic Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and Critic Output
Part 02 - Critique Dimensions and Structure
Part 03 - Critic Models and Prompting
Part 04 - Implementation Checklist and Future Expansion

# Critique Dimensions

The Critic SHOULD evaluate along stable dimensions so feedback is comparable across passes:

- correctness: does it do what the task asked.
- completeness: are all checklist items addressed.
- quality: readability, structure, edge cases.
- security: obvious vulnerabilities or unsafe patterns.
- efficiency: unnecessary cost or redundant work.
- intent match: does the artifact still serve the user goal.

# Severity

Each issue carries a severity: blocker, major, minor, nit. Blocker and major issues MUST be addressed in the next Builder pass. Minor and nit issues SHOULD be addressed if budget allows.

# Structure Rules

Feedback MUST be machine-readable so the Builder can be prompted with it directly. The Critic MUST NOT bury the最重要 feedback in narrative. Rank issues by severity.

# Related Documents

- [[Critic-Part01]]
- [[RefinementLoop-Part03]]
- [[Builder-Part01]]
