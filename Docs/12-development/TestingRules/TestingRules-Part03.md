---
title: TestingRules Specification - Part 03
status: draft
version: 1.0
tags:
  - development
  - testing-rules
related:
  - "[[12-development/README]]"
  - "[[TestingRules-Part02]]"
  - "[[TestingRules-Part01]]"
---

# TestingRules Specification (Part 03)

## Document Index

Part 01 - Testing Policy & What MUST Be Tested
Part 02 - Unit & Integration Testing
Part 03 - E2E, Performance & AI-Assisted Test Authoring

# Purpose

This part covers end-to-end testing, performance testing, and how the cheap model authors tests.

# End-to-End (E2E) Testing

- Playwright drives the built app (or web preview) for critical user journeys: create workspace, spawn a worker terminal, run a command, observe streaming output, open the graph.
- E2E tests MUST be few, high-value, and stable; they are not a substitute for unit coverage.
- Secrets/keys MUST NOT be required for E2E; use a mock provider or local stub.

# Performance Testing

- Virtualized lists and lazy routes MUST be validated for large collections (hundreds of terminals/history entries).
- A lightweight perf smoke test SHOULD assert no unbounded re-render storms on the canvas with many nodes.

# AI-Assisted Test Authoring (MUST)

The cheap model MUST author tests as part of each small task, not as an afterthought. When it implements a service, store, or util, it MUST add the corresponding `*.test.ts`. It MUST run the suite and ensure green before committing.

# Flake Policy

A flaky test is a bug. If a test cannot be made deterministic quickly, it MUST be quarantined and tracked, not ignored. CI MUST fail on flake.

# Related Documents

- [[TestingRules-Part01]]
- [[GitWorkflow-Part03]]
- [[AIInstructions-Part02]]
