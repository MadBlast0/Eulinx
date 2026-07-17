---
title: ReleaseProcess Specification - Part 02
status: draft
version: 1.0
tags:
  - development
  - release-process
related:
  - "[[12-development/README]]"
  - "[[ReleaseProcess-Part01]]"
  - "[[ReleaseProcess-Part03]]"
---

# ReleaseProcess Specification (Part 02)

## Document Index

Part 01 - Versioning Scheme
Part 02 - Release Pipeline Stages
Part 03 - Build, Sign, Distribute & Rollback

# Purpose

This part defines the pipeline stages from a tagged commit to a published artifact. The pipeline is fully automated in CI so human effort is review, not manual building.

# Pipeline Stages

1. Tag — a maintainer creates `vX.Y.Z` from `main` (after the release branch passes).
2. CI gate — full lint, format, typecheck, unit + integration + E2E, build of the frontend.
3. Rust build — `cargo build` (release profile) for each target OS (Windows, macOS, Linux).
4. Bundle — Tauri bundles the app (MSI/EXE, DMG, AppImage/deb) using the version constant.
5. Sign — native code-signing (and notarization for macOS) applied to the artifacts.
6. Publish — artifacts uploaded to the distribution channel; release notes generated from the changelog.
7. Announce — optional in-app update notification via the Tauri updater.

# Branch & Tag Policy

- Releases are cut from `main` only.
- A `release/vX.Y.Z` branch MAY exist to stabilize; it MUST NOT receive features, only release-blocking fixes, which are back-merged to `main`.
- Tags are immutable; a bad release is superseded by a new PATCH, never rewritten.

# Related Documents

- [[ReleaseProcess-Part03]]
- [[TestingRules-Part01]]
- [[GitWorkflow-Part03]]
