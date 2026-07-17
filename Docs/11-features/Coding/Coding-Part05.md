---
title: Coding Specification - Part 05
status: draft
version: 1.0
tags:
  - features
  - coding
related:
  - "[[Coding-Part04]]"
  - "[[RefinementLoop-Part01]]"
  - "[[PermissionManager-Part01]]"
---

# Coding Specification (Part 05)

## Document Index

Part 01 - Purpose, Scope, and the Coding Feature Model
Part 02 - Agentic Coding Loop and Multi-File Refactors
Part 03 - Inline Editor, Diffs, and Artifact Review
Part 04 - PR / Commit Automation and Release Notes
Part 05 - Refinement on Code, Safety, and AI Notes

# Refinement Applied to Code

The refinement control (Low, Medium, High, Ultra) applies directly to code quality. A generated change passes through critique and refine passes before acceptance:

- Low = draft only
- Medium = up to 2 refine passes
- High = up to 4 refine passes
- Ultra = up to 8 refine passes with a stronger critic

Refinement never replaces objective verification. Build/lint/test remain authoritative. Refinement improves style, correctness reasoning, and edge-case handling; the Verifier confirms.

# Safety Rails

Coding MUST enforce:

- workspace scoping (never write outside the project folder without explicit grant)
- lock ownership (no worker edits a file/symbol it does not own)
- artifact-first writes (no direct writes to the live tree; always via MergeManager)
- permission gating on external actions (push, PR open, publish)

Destructive actions (force-push, delete branch, overwrite) MUST require explicit human approval through the PermissionManager.

# Honesty in UX

The UX MUST NOT claim refinement makes a base model equal a flagship model. It claims measurably better output per dollar via iteration, with a stopping rule and cost budget. When a task is beyond the model, the system communicates this rather than looping forever.

# AI Notes

Do not write generated code directly to disk; produce an Artifact and let the MergeManager apply it.

Do not skip the Verifier for "simple" changes; objective checks are cheap and authoritative.

Do not let two workers share a whole-file lock when symbol-level locking is possible.

Do not treat an LLM-judge's code review as truth; label it as suggested.

# Related Documents

- [[RefinementLoop-Part01]]
- [[PermissionManager-Part01]]
