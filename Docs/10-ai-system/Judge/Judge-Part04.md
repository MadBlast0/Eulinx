---
title: Judge Specification - Part 04
status: draft
version: 1.0
tags:
  - ai-system
  - judge
  - implementation
related:
  - "[[Judge-Part03]]"
---

# Judge Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, and Verdicts
Part 02 - Acceptance Criteria and Scoring
Part 03 - Judge Models and Honesty
Part 04 - Implementation Checklist and Future Expansion

# Implementation Checklist

1. Define verdict enum (accept / reject / stop).
2. Define scoring schema and rationale field.
3. Wire Judge after Critic in the loop.
4. Enforce hard gates from Verifier results.
5. Select Judge model profile per mode.
6. Persist verdicts per pass for replay.
7. Emit judge event to the `EventBus`.

# Future Expansion

- Multi-judge voting for critical artifacts.
- User-overridable acceptance thresholds.
- Judge that requests human approval on uncertain verdicts.

# AI Notes

Do not let the Judge also write the artifact. Adjudication and generation must stay separate.

Do not accept artifacts that fail objective checks. The Verifier is the truth; the Judge is the gate.

Do not treat judge scores as certain. Label them as suggested when unbacked by verification.

# Related Documents

- [[Judge-Part01]]
- [[RefinementLoop-Part04]]
- [[Verifier-Part01]]
