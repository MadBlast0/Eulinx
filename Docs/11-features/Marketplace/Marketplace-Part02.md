---
title: Marketplace Specification - Part 02
status: draft
version: 1.0
tags:
  - features
  - marketplace
related:
  - "[[Marketplace-Part01]]"
  - "[[Marketplace-Part03]]"
  - "[[PluginLifecycle-Part03]]"
---

# Marketplace Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and the Marketplace Model
Part 02 - Discovery, Install, and Update
Part 03 - Trust, Provenance, and Consent
Part 04 - Publishing and Author Identity
Part 05 - Template/Prompt/Agent-Team Listings and AI Notes

# Discovery

The discovery UI lists plugins, templates, prompts, and agent teams with filters by type, category, compatibility, and rating. Each listing shows required capabilities so the user understands the risk before installing.

# Install

Install delegates to the PluginLifecycle engine:

- download the bundle
- verify id and signature
- check the `engines` semver range against the running Eulinx version
- present the consent dialog for declared capabilities
- on grant, place the plugin in `installed` and activate per lifecycle rules

A plugin whose id collides with another or with the reserved `Eulinx` namespace is rejected. A plugin whose range does not include the running version is placed in `unavailable`, never force-activated.

# Update

Updates follow the same path with a version bump. An update that widens required capabilities MUST re-trigger consent. Auto-update is off by default for anything that changes capabilities.

# Related Documents

- [[Marketplace-Part03]]
- [[PluginLifecycle-Part03]]
