---
title: Templates Specification - Part 01
status: draft
version: 1.0
tags:
  - features
  - templates
related:
  - "[[11-features/README]]"
  - "[[Templates-Part02]]"
  - "[[Automations-Part01]]"
---

# Templates Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and the Template Object
Part 02 - The Template Gallery and Import
Part 03 - Authoring, Versioning, and Parameterization
Part 04 - Publishing and Marketplace Sync

# Purpose

The Templates feature makes Eulinx usable by everyone, not just engineers. A casual user picks a template, presses run, and watches it work. Templates are the primary growth and community engine.

A template is a reusable, parameterized Workflow (or prompt set, or agent team) that can be imported into a workspace and adapted. Templates are portable: they export/import as JSON and never embed secrets.

# Scope

Templates are portable across workspaces and machines. A template does not carry workspace-specific paths or credentials; it declares parameters the importer fills in.

# The Template Object

A template carries:

- an id and a human title
- a description and intended audience
- the graph definition (nodes, edges, modes)
- declared parameters (with defaults and types)
- a required-capability list (which MCP/tools it needs)
- a version and an author/owner reference

Templates reference official and community sources. Read-only browsing is Free; importing and publishing require Plus or Pro.

# What Templates Owns

The template feature owns:

- the gallery UI and import flow
- template authoring and versioning
- parameter resolution at import
- the bridge to the Marketplace for publishing

It does NOT own graph execution or rendering; those are the WorkflowEngine and UI.

# Related Documents

- [[Templates-Part02]]
- [[Automations-Part01]]
