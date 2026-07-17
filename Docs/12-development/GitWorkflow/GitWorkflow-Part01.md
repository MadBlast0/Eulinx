---
title: GitWorkflow Specification - Part 01
status: draft
version: 1.0
tags:
  - development
  - git-workflow
related:
  - "[[12-development/README]]"
  - "[[GitWorkflow-Part02]]"
  - "[[GitWorkflow-Part03]]"
---

# GitWorkflow Specification (Part 01)

## Document Index

Part 01 - Branch Strategy & Repository Setup
Part 02 - Commit Message Convention
Part 03 - Pull Requests, Review & Merge Policy

# Purpose

GitWorkflow defines how changes enter the Eulinx repository. A clean history is especially important because the cheap coding model often works in small increments; consistent branches and commits keep its output reviewable.

# Repository Setup

Git MUST be initialized at project creation. A `.gitignore` MUST exclude `node_modules/`, `dist/`, `src-tauri/target/`, `.env*` (except `.env.example`), and OS/editor cruft. `pnpm-lock.yaml` MUST be committed; `package-lock.json` and `yarn.lock` MUST NOT exist.

The default branch is `main`. It MUST always be releasable. Direct pushes to `main` are forbidden; all changes arrive via pull request.

# Branch Strategy

Eulinx uses a simplified trunk-based flow suited to a small team plus an AI model:

- `main` — always releasable trunk.
- Short-lived feature branches: `feat/<kebab-slug>` (e.g. `feat/terminal-pane`).
- Fix branches: `fix/<kebab-slug>`.
- Chore/refactor: `chore/<kebab-slug>`.
- Docs: `docs/<kebab-slug>`.
- Release branches when cutting a version: `release/vX.Y.Z`.

Branches MUST be short-lived (ideally merged within days). Long-lived diverging branches are forbidden because they cause the cheap model to lose context.

# Branch Naming Examples

- `feat/global-design-tokens`
- `fix/pty-resize-handling`
- `chore/eslint-config`
- `docs/architecture-rules`

# Related Documents

- [[GitWorkflow-Part02]]
- [[ProjectRules-Part01]]
- [[CodingStandards-Part04]]
