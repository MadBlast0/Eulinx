---
title: Marketplace Specification - Part 05
status: draft
version: 1.0
tags:
  - features
  - marketplace
related:
  - "[[Marketplace-Part04]]"
  - "[[Templates-Part01]]"
  - "[[PluginLifecycle-Part01]]"
---

# Marketplace Specification (Part 05)

## Document Index

Part 01 - Purpose, Scope, and the Marketplace Model
Part 02 - Discovery, Install, and Update
Part 03 - Trust, Provenance, and Consent
Part 04 - Publishing and Author Identity
Part 05 - Template/Prompt/Agent-Team Listings and AI Notes

# Listing Types

Beyond plugins, the marketplace lists:

- templates (reusable workflows, see [[Templates-Part01]])
- prompts (versioned, shareable prompt templates)
- agent teams (a saved worker hierarchy / orchestrator configuration)

Each type carries the same provenance and consent model appropriate to its required capabilities.

# AI Notes

Do not trust any marketplace download; verify id and signature before install.

Do not auto-grant capabilities; always present consent with the verbatim reason.

Do not force-activate a plugin whose `engines` range excludes the running Eulinx version.

Do not let a plugin choose a colliding id; reject at install.

Do not embed secrets in a published item; strip and re-prompt at import.

# Related Documents

- [[Templates-Part01]]
- [[PluginLifecycle-Part01]]
