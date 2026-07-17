---
title: Marketplace Specification - Part 03
status: draft
version: 1.0
tags:
  - features
  - marketplace
related:
  - "[[Marketplace-Part02]]"
  - "[[Marketplace-Part04]]"
  - "[[PermissionManager-Part01]]"
---

# Marketplace Specification (Part 03)

## Document Index

Part 01 - Purpose, Scope, and the Marketplace Model
Part 02 - Discovery, Install, and Update
Part 03 - Trust, Provenance, and Consent
Part 04 - Publishing and Author Identity
Part 05 - Template/Prompt/Agent-Team Listings and AI Notes

# Trust Model

The threat model is "a plugin authored specifically to exfiltrate this user's repository and API keys, published under a plausible name." Everything downloaded is untrusted until verified.

# Provenance and Signature

A listing references a detached signature. The host verifies the signature against the declared author identity before install. An unsigned plugin from an unverified author is flagged high-risk; a plugin whose presented id does not match its verified identity is rejected.

# Consent

Every declared capability is shown verbatim with its plain-language reason in the consent dialog. The user may grant a subset; the grant becomes the stored record the PermissionManager enforces at runtime. A capability not declared and granted does not exist for that plugin — no runtime request can create one.

# Related Documents

- [[Marketplace-Part04]]
- [[PermissionManager-Part01]]
