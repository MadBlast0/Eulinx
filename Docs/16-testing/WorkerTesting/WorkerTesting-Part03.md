---
title: WorkerTesting Specification - Part 03
status: draft
version: 1.0
tags:
  - testing
  - worker-testing
  - artifacts
related:
  - "[[WorkerTesting-Part02]]"
  - "[[WorkerTesting-Part04]]"
---

# WorkerTesting Specification (Part 03)

## Document Index

Part 01 - Purpose, Determinism, and the Replay Harness
Part 02 - Lifecycle and Hierarchy Testing
Part 03 - Artifact, Verification, and Merge Testing
Part 04 - Refinement Loop and Orchestrator Testing
Part 05 - Failure, Recovery, and Chaos Testing

# Artifact Testing

Workers communicate through artifacts, not raw transcripts (see [[05-artifacts/README]] if present). Tests MUST assert:

- a Worker produces an artifact of the expected type (patch, code, markdown, json, image, test result),
- the artifact is stored by ArtifactManager and linked to its producer Worker and Task,
- artifact references (not full content) are passed downstream to keep context small,
- an artifact version chain records each revision.

# Verification Testing

The verifier distinguishes objective checks from heuristic LLM-judge checks (per ChatHistory). Tests MUST assert:

- objective checks (build, lint, type-check, test run) are authoritative and can fail the artifact,
- an LLM-judge verdict is labelled "suggested" and never auto-accepted as truth,
- a failed verification routes the artifact back to a fix Worker,
- a verified artifact becomes eligible for merge.

# Merge Testing

Merge Manager (per [[02-runtime/MergeManager-Part01]] if present) MUST be tested for:

- two non-overlapping patches merge cleanly with no conflict,
- two overlapping patches are detected as a conflict and routed to manual/auto-merge,
- a merged artifact is applied to the workspace only after verification,
- a rejected merge leaves the workspace unchanged (atomicity).

# Related Documents

- [[05-artifacts/README]]
- [[02-runtime/MergeManager-Part01]]
