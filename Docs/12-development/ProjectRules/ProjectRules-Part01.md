---
title: ProjectRules Specification - Part 01
status: draft
version: 1.0
tags:
  - development
  - project-rules
related:
  - "[[12-development/README]]"
  - "[[ProjectRules-Part02]]"
  - "[[ProjectRules-Part03]]"
---

# ProjectRules Specification (Part 01)

## Document Index

Part 01 - Licensing, Ownership & Governance Docs
Part 02 - Environment, Secrets & Configuration
Part 03 - Contributor Expectations & Scope Safety

# Purpose

ProjectRules defines the overall governance of the Eulinx project: licensing, the authoritative documentation set, environment handling, and contributor expectations. These rules sit above individual coding style and bind the whole effort.

# Licensing (MUST)

Eulinx is a private, proprietary desktop application. The repository MUST contain a `LICENSE` file stating proprietary ownership and forbidding redistribution. No open-source license is applied. The codebase is not intended for public contribution under open-source terms.

# Authoritative Documents (MUST)

Three root documents are authoritative and MUST be kept current:

- `README.md` — project overview, setup, and how to run.
- `CLAUDE.md` (or `AI.md`) — the rule file the cheap coding model reads first (see [[AIInstructions-Part01]]).
- `LICENSE` — ownership and usage terms.

If any specification in this vault conflicts with these root files on a governance point, the root file wins; the vault MUST be corrected.

# Documentation Vault

This `docs/` vault (the `Project-Plan/Docs` set) is the single source of truth for architecture and conventions. Changes to architecture MUST update the relevant spec part and its `Document Index`/cross-links. Stale specs are a defect.

# Related Documents

- [[ProjectRules-Part02]]
- [[AIInstructions-Part01]]
- [[12-development/README]]
