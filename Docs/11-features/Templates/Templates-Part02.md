---
title: Templates Specification - Part 02
status: draft
version: 1.0
tags:
  - features
  - templates
related:
  - "[[Templates-Part01]]"
  - "[[Templates-Part03]]"
  - "[[Marketplace-Part01]]"
---

# Templates Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and the Template Object
Part 02 - The Template Gallery and Import
Part 03 - Authoring, Versioning, and Parameterization
Part 04 - Publishing and Marketplace Sync

# The Template Gallery

The gallery is a browse surface showing official and community templates. Each card shows title, description, audience, capability requirements, and a run-cost estimate. Users filter by category (coding, research, automation, productivity).

Browsing is read-only on Free. Plus and Pro can import and run. The gallery reads from the local cache and, when online, from the Marketplace.

# Import Flow

Importing a template:

- resolves parameters interactively (user fills paths, selects models, enables required MCPs)
- validates required capabilities against granted permissions
- clones the graph into the active workspace as a new Workflow
- emits a `template_imported` event

Import MUST NOT carry credentials. Any parameter that looks like a secret is stripped and re-prompted at import time.

# Starter Templates

First-run onboarding suggests a starter template after the user picks a project folder. This is the wedge: a non-technical user can "pick and run".

# Related Documents

- [[Templates-Part03]]
- [[Marketplace-Part01]]
