---
title: ProjectRules Specification - Part 02
status: draft
version: 1.0
tags:
  - development
  - project-rules
related:
  - "[[12-development/README]]"
  - "[[ProjectRules-Part01]]"
  - "[[ProjectRules-Part03]]"
---

# ProjectRules Specification (Part 02)

## Document Index

Part 01 - Licensing, Ownership & Governance Docs
Part 02 - Environment, Secrets & Configuration
Part 03 - Contributor Expectations & Scope Safety

# Purpose

This part governs environment files, secrets, and configuration. Local-first privacy is a core product promise, so secret handling is a hard rule.

# Environment Files

- A `.env.example` template MUST be committed showing required variables (e.g. dev flags, optional provider base URLs) with placeholder values.
- Real `.env`, `.env.local`, and any key files MUST be git-ignored and MUST NEVER be committed.
- Provider API keys are user-supplied at runtime and stored in the OS secure store via Tauri, never in plaintext files or the repo.

# Secrets Rule (MUST)

- No API keys, tokens, signing keys, or private certificates in the repository.
- CI secrets are injected by the CI provider only.
- The cheap model MUST be instructed never to write secrets into code, config, or commits.

# Configuration Loading

- Runtime configuration is resolved in `src/config/` from environment + stored settings.
- Build-time config (Tauri) lives in `tauri.conf.json` and MUST NOT contain secrets.

# Related Documents

- [[ProjectRules-Part03]]
- [[AIInstructions-Part03]]
- [[ReleaseProcess-Part03]]
