---
title: ReleaseProcess Specification - Part 01
status: draft
version: 1.0
tags:
  - development
  - release-process
related:
  - "[[12-development/README]]"
  - "[[ReleaseProcess-Part02]]"
  - "[[ReleaseProcess-Part03]]"
---

# ReleaseProcess Specification (Part 01)

## Document Index

Part 01 - Versioning Scheme
Part 02 - Release Pipeline Stages
Part 03 - Build, Sign, Distribute & Rollback

# Purpose

ReleaseProcess defines how Eulinx moves from `main` to a shipped desktop build. A predictable versioning and pipeline policy lets the cheap model's output be released confidently and rolled back safely.

# Versioning Scheme

Eulinx uses Semantic Versioning (`MAJOR.MINOR.PATCH`):

- `MAJOR` — breaking change to user-facing behavior, data model, or the public graph/JSON format.
- `MINOR` — new feature or capability added in a backward-compatible way.
- `PATCH` — bug fix, hardening, or internal improvement.

Pre-release tags MAY be used for early builds: `X.Y.Z-alpha.N`, `X.Y.Z-beta.N`.

The version MUST be single-sourced: defined once (e.g. in `package.json` / a `version` constant) and read by both the Rust bundle config and the about screen. Bumping MUST update all surfaces atomically in one commit on a `release/vX.Y.Z` branch.

# Changelog

Every release MUST produce a changelog derived from Conventional Commit scopes since the last tag. The coding/agentic-feature areas (per the PRD) SHOULD be grouped: Features, Fixes, Performance, Refinement, Automations.

# Related Documents

- [[ReleaseProcess-Part02]]
- [[GitWorkflow-Part01]]
- [[ProjectRules-Part01]]
