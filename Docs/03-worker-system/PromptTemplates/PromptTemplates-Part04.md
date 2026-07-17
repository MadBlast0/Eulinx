---
title: PromptTemplates Specification - Part 04
status: draft
version: 1.0
tags:
  - worker-system
  - prompts
  - implementation
related:
  - "[[PromptTemplates-Part01]]"
---

# PromptTemplates Specification (Part 04)

## Document Index

Part 01 - Purpose, Template Types, and Structure
Part 02 - Worker Instructions, Output Contracts, and Constraints
Part 03 - Variables, Versioning, Testing, and Reuse
Part 04 - UI, Events, and Implementation Checklist

# Events

```text
prompt_template.created
prompt_template.updated
prompt_template.versioned
prompt_template.used
prompt_template.tested
```

# UI

UI should support:

- template library
- template editor
- variable preview
- version history
- test run

# Implementation Checklist

```text
[ ] Define PromptTemplate
[ ] Add template variables
[ ] Add output contracts
[ ] Add versioning
[ ] Record template usage
[ ] Add UI editor
[ ] Add tests for rendering
```

# Final AI Notes

Prompt templates are one of the main ways Eulinx makes cheap models useful.

# Related Documents

- [[PromptTemplates-Part01]]
- [[Prompt-Part01]]

