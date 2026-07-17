---
title: Templates Specification - Part 04
status: draft
version: 1.0
tags:
  - features
  - templates
related:
  - "[[Templates-Part03]]"
  - "[[Marketplace-Part01]]"
---

# Templates Specification (Part 04)

## Document Index

Part 01 - Purpose, Scope, and the Template Object
Part 02 - The Template Gallery and Import
Part 03 - Authoring, Versioning, and Parameterization
Part 04 - Publishing and Marketplace Sync

# Publishing

A Plus or Pro user can publish a template to the Marketplace. Publishing:

- attaches author identity and version
- runs a validation pass (no secrets, declared capabilities, valid graph)
- submits to the marketplace with a provenance record

# Marketplace Sync

Published templates appear in the gallery for other users. Sync is over encrypted storage when the optional cloud is enabled; templates remain portable as JSON even when fully local.

# AI Notes

Do not embed secrets or workspace paths in a template; declare parameters instead.

Do not publish a template whose capability requirements are undeclared; this breaks import-time consent.

Do not treat prompt templates as throwaway strings; version and test them like code.

# Related Documents

- [[Marketplace-Part01]]
