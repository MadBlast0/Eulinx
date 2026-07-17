---
title: CodingStandards Specification - Part 04
status: draft
version: 1.0
tags:
  - development
  - coding-standards
related:
  - "[[12-development/README]]"
  - "[[CodingStandards-Part03]]"
  - "[[ProjectRules-Part01]]"
---

# CodingStandards Specification (Part 04)

## Document Index

Part 01 - TypeScript Language Rules
Part 02 - React & Component Rules
Part 03 - Rust Thin-Backend Rules
Part 04 - Lint, Format, Typecheck & Enforcement

# Purpose

This part defines the enforcement tooling. Rules only matter if they are enforced automatically; the cheap model cannot be relied upon to self-police style.

# Lint, Format, Typecheck

ESLint MUST be configured with the React + TypeScript recommended rules. New rules MUST be added conservatively to avoid noisy failures the cheap model cannot resolve.

Prettier MUST be the single formatter. ESLint MUST NOT enforce formatting rules that conflict with Prettier; use `eslint-config-prettier` to disable conflicts.

TypeScript compiler (`tsc --noEmit`) MUST pass with strict mode on every change.

# Pre-Commit & CI Gates

A pre-commit hook (or equivalent) MUST run ESLint, Prettier check, and `tsc` on staged files.

CI MUST run the full gate on every pull request: lint, format check, typecheck, unit tests, and build. A PR that fails any gate MUST NOT be mergeable.

# Formatting Defaults

- Double quotes, no semicolons (or project-chosen consistent style) — chosen once and fixed in config.
- 2-space indentation.
- Trailing commas where valid.
- Line length guidance ~100 characters; not a hard failure.

# AI Note on Enforcement

The cheap model MUST be directed to run the local lint/format/typecheck before considering a task complete. If a gate fails, it MUST fix the root cause, not disable the rule or use `eslint-disable` to silence it.

# Related Documents

- [[ProjectRules-Part02]]
- [[TestingRules-Part01]]
- [[GitWorkflow-Part02]]
