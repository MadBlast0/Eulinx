---
title: Marketplace Specification - Part 04
status: draft
version: 1.0
tags:
  - features
  - marketplace
related:
  - "[[Marketplace-Part03]]"
  - "[[Marketplace-Part05]]"
---

# Marketplace Specification (Part 04)

## Document Index

Part 01 - Purpose, Scope, and the Marketplace Model
Part 02 - Discovery, Install, and Update
Part 03 - Trust, Provenance, and Consent
Part 04 - Publishing and Author Identity
Part 05 - Template/Prompt/Agent-Team Listings and AI Notes

# Publishing

A Plus or Pro user publishes to the marketplace. Publishing submits the bundle with author identity, version, and a validation pass (no embedded secrets, declared capabilities, valid manifest). The marketplace records provenance.

# Author Identity

Author identity is the basis for trust signals (verified author, history, ratings). The marketplace assigns or verifies the `id`; authors cannot self-assert a colliding id. Namespacing is built from the verified id, and audit records carry it.

# Moderation and Reporting

The marketplace provides reporting for malicious listings. A reported item is quarantined pending review. Eulinx locally caches a revocation list so a known-bad id is refused at install even offline.

# Related Documents

- [[Marketplace-Part05]]
