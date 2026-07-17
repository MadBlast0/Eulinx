---
title: ReleaseProcess Specification - Part 03
status: draft
version: 1.0
tags:
  - development
  - release-process
related:
  - "[[12-development/README]]"
  - "[[ReleaseProcess-Part02]]"
  - "[[ReleaseProcess-Part01]]"
---

# ReleaseProcess Specification (Part 03)

## Document Index

Part 01 - Versioning Scheme
Part 02 - Release Pipeline Stages
Part 03 - Build, Sign, Distribute & Rollback

# Purpose

This part covers the build/sign/distribute mechanics and the rollback policy. Because Eulinx is local-first and proprietary, distribution is controlled and reversible.

# Build & Sign

- The frontend is built with Vite; output is consumed by Tauri's bundler.
- Rust release builds MUST use the release profile with optimizations; debug symbols handled per platform policy.
- Code signing keys MUST live in CI secrets, never in the repo. macOS notarization credentials are CI-only.
- The Tauri updater signing keys MUST be managed securely; the public key ships in the app.

# Distribution

- Primary distribution is direct download (installer per OS) from the official channel.
- The in-app updater (Tauri) fetches the latest signed release manifest; it MUST verify signature before applying.
- No model keys or user data are transmitted; distribution is binary-only.

# Rollback Policy

- If a release is defective, ship a new PATCH that fixes it; do not pull the binary silently.
- The updater MUST allow pinning/ignoring a bad version via the signed manifest.
- Data-model breaking changes MUST gate behind migration (see [[08-database/README]] migration strategy) and MUST bump `MAJOR`.

# Related Documents

- [[ReleaseProcess-Part01]]
- [[ProjectRules-Part03]]
- [[04-memory/README]]
