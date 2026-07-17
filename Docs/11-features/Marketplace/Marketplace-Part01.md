---
title: Marketplace Specification - Part 01
status: draft
version: 1.0
tags:
  - features
  - marketplace
related:
  - "[[11-features/README]]"
  - "[[Marketplace-Part02]]"
  - "[[PluginLifecycle-Part01]]"
---

# Marketplace Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and the Marketplace Model
Part 02 - Discovery, Install, and Update
Part 03 - Trust, Provenance, and Consent
Part 04 - Publishing and Author Identity
Part 05 - Template/Prompt/Agent-Team Listings and AI Notes

# Purpose

The Marketplace is where users discover, install, update, and publish extensions to Eulinx: plugins, templates, prompts, and agent teams. It is the community and growth engine, and the distribution channel for the plugin system.

The Marketplace is a content source, not a runtime. It lists items with metadata and provenance; the PluginLifecycle engine performs the actual install, consent, and activation. The Marketplace MUST be treated as untrusted: anything downloaded from it could be hostile.

# Scope

The marketplace is optional. Eulinx works fully local with local plugin paths and portable templates. When the optional cloud is enabled, the marketplace syncs over encrypted storage.

# The Marketplace Model

A marketplace listing carries:

- an id (marketplace-assigned or install-generated)
- a type (plugin, template, prompt, agent-team)
- author identity and version
- a capability/requirement declaration
- a provenance and signature reference
- ratings, download counts, and compatibility range

# What Marketplace Owns

The marketplace feature owns:

- the discovery and listing UI
- the install/update orchestration calls into PluginLifecycle
- the publishing submission flow
- the consent presentation for required capabilities

It does NOT own sandboxing, activation, or capability enforcement; those are PluginLifecycle and PermissionManager.

# Related Documents

- [[Marketplace-Part02]]
- [[PluginLifecycle-Part01]]
