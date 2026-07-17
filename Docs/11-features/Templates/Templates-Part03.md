---
title: Templates Specification - Part 03
status: draft
version: 1.0
tags:
  - features
  - templates
related:
  - "[[Templates-Part02]]"
  - "[[Templates-Part04]]"
  - "[[PromptOptimization-Part01]]"
---

# Templates Specification (Part 03)

## Document Index

Part 01 - Purpose, Scope, and the Template Object
Part 02 - The Template Gallery and Import
Part 03 - Authoring, Versioning, and Parameterization
Part 04 - Publishing and Marketplace Sync

# Authoring

A user authors a template by saving a Workflow (or prompt set) as a template. Authoring captures the graph, the parameter declarations, and the capability requirements. Authoring MUST strip workspace-specific state and secrets before save.

# Versioning

Templates are versioned. A new version records a changelog and remains compatible with imports of older versions where possible. Versioning reuses the same semantic-version rules as plugins: a major bump signals breaking parameter changes.

# Parameterization

A parameter is a named, typed slot with a default. Supported kinds:

- text (e.g., a folder path)
- choice (e.g., a model profile)
- boolean (e.g., enable browser)
- secret-reference (resolved at import from the OS secure store, never stored in the template)

Parameterization is what makes one template reusable across many workspaces.

# Prompt Templates

A template may bundle prompt templates: versioned, shareable, importable prompts with variables and inheritance. Prompt management is a first-class opportunity (version, share, import, test, template, variables, inheritance, libraries).

# Related Documents

- [[Templates-Part04]]
- [[PromptOptimization-Part01]]
