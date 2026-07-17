---
title: Critic Specification - Part 04
status: draft
version: 1.0
tags:
  - ai-system
  - critic
  - implementation
related:
  - "[[Critic-Part03]]"
---

# Critic Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, and Critic Output
Part 02 - Critique Dimensions and Structure
Part 03 - Critic Models and Prompting
Part 04 - Implementation Checklist and Future Expansion

# Implementation Checklist

1. Define the feedback schema (issues, strengths, suggestions, questions).
2. Wire critic invocation after Verifier in the loop.
3. Route critic feedback into the next Builder prompt.
4. Select critic model profile per mode.
5. Persist critic output per pass for replay.
6. Emit critic event to the `EventBus`.

# Future Expansion

- Multi-critic voting for high-stakes artifacts.
- Critic that cites workspace files as evidence.
- Learned severity thresholds.

# AI Notes

Do not let the Critic decide acceptance. That is the Judge's role; mixing them removes accountability.

Do not write the critic prompt inline. Use `PromptOptimization` so it stays versioned and cached.

Do not over-criticize. One structured pass per iteration is enough.

# Related Documents

- [[Critic-Part01]]
- [[RefinementLoop-Part03]]
- [[Judge-Part01]]
