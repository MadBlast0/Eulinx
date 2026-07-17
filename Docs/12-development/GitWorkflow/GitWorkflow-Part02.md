---
title: GitWorkflow Specification - Part 02
status: draft
version: 1.0
tags:
  - development
  - git-workflow
related:
  - "[[12-development/README]]"
  - "[[GitWorkflow-Part01]]"
  - "[[GitWorkflow-Part03]]"
---

# GitWorkflow Specification (Part 02)

## Document Index

Part 01 - Branch Strategy & Repository Setup
Part 02 - Commit Message Convention
Part 03 - Pull Requests, Review & Merge Policy

# Purpose

This part defines the commit message convention. Commits are the unit of review for AI-generated code, so they MUST be small, scoped, and self-describing.

# Commit Message Format

Each commit MUST follow the Conventional Commits structure:

- `type(scope): summary` as the subject line (max ~72 chars).
- An optional blank line then a body explaining WHY, not WHAT (the diff shows what).
- An optional footer for breaking changes or issue references.

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `style`, `build`, `ci`.

Scope is the affected domain in kebab-case: `graph`, `terminals`, `agents`, `memory`, `rust`, `design-system`.

# Examples

- `feat(terminals): add split-pane resize handle`
- `fix(rust): close PTY on worker destroy to free handles`
- `chore(deps): pin tauri v2 to exact patch`
- `docs(development): add architecture-rules invoke boundary`

# Commit Size Rule (MUST)

Commits MUST be atomic and focused. A single commit MUST NOT mix unrelated changes (e.g. a design-token change and a terminal bug fix). The cheap model SHOULD be directed to commit per logical step so history reads as a clear story.

# Forbidden

- No `"wip"`, `"fix"`, `"updates"`, or empty summaries.
- No committing secrets, `.env` files, or lockfiles other than `pnpm-lock.yaml`.
- No `--no-verify` to bypass hooks.

# Related Documents

- [[GitWorkflow-Part03]]
- [[NamingConvention-Part01]]
- [[AIInstructions-Part02]]
