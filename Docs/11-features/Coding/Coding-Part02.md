---
title: Coding Specification - Part 02
status: draft
version: 1.0
tags:
  - features
  - coding
related:
  - "[[Coding-Part01]]"
  - "[[Coding-Part03]]"
  - "[[MergeManager-Part01]]"
  - "[[RefinementLoop-Part01]]"
---

# Coding Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and the Coding Feature Model
Part 02 - Agentic Coding Loop and Multi-File Refactors
Part 03 - Inline Editor, Diffs, and Artifact Review
Part 04 - PR / Commit Automation and Release Notes
Part 05 - Refinement on Code, Safety, and AI Notes

# Agentic Coding Loop

The signature coding flow is the agentic loop: plan, implement, run tests, read failures, fix, repeat.

Each iteration runs inside a worker terminal. The worker:

- reads the relevant task and selected context
- proposes a change as a new Artifact (a patch, not a direct write)
- asks the Verifier to run objective checks (build, lint, type-check, tests)
- reads failure output and revises the Artifact
- repeats until checks pass or a stop rule triggers

The loop is bounded by a stopping rule: a max iteration count, a token/cost budget, or a judge decision. Some tasks a base model cannot complete however many loops run; the UX MUST communicate this honestly.

# Multi-File Refactors

For large changes, the orchestrator splits the work across workers, each context-isolated, each owning a subset of files.

File ownership is governed by the LockManager. The recommended granularity is symbol-level locking: Worker 1 owns `Login()`, Worker 2 owns `JWT()`, both may edit `auth.ts` simultaneously. This is far more scalable than whole-file locks.

Each worker edits inside its own sandbox and produces an Artifact (a patch). The Verifier runs build/lint across the union of patches. The MergeManager then applies:

- conflict detection against the current workspace tree
- auto-merge where non-overlapping
- routing to a human or orchestrator for manual merge only on true conflict

This mirrors how Git branches work internally: workers never fight over the live tree.

# Fan-Out Safety

The orchestrator may spawn N workers for N subtasks. Each worker reports progress (e.g., 45%) up to its task orchestrator (73%), phase orchestrator (61%), and project (28%). Progress aggregation is automatic at every level and MUST NOT require manual status updates.

# Related Documents

- [[Coding-Part03]]
- [[MergeManager-Part01]]
- [[RefinementLoop-Part01]]
