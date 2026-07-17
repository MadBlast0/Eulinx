---
title: Automations Specification - Part 05
status: draft
version: 1.0
tags:
  - features
  - automations
related:
  - "[[Automations-Part04]]"
  - "[[Templates-Part01]]"
  - "[[PermissionManager-Part01]]"
---

# Automations Specification (Part 05)

## Document Index

Part 01 - Purpose, Scope, and the Automation Model
Part 02 - Triggers and Actions
Part 03 - AI-Native Nodes and Logic Gates
Part 04 - Scheduled and Recurring Execution
Part 05 - Templates, Safety, and AI Notes

# Templates

Automations are the primary template unit. A prebuilt automation (e.g., "summarize new files nightly") is imported from the Templates gallery and adapted. Templates are the growth engine: the n8n advantage is its large template library; Eulinx needs a gallery for traction.

# Safety

Automations MUST NOT auto-execute destructive or external actions without an approval gate. Push, delete, publish, and webhook-to-external are gated by PermissionManager. An automation that would exceed a cost budget MUST warn before running (especially Ultra mode).

# AI Notes

Do not implement automations as a separate runtime; reuse the WorkflowEngine and Runtime services.

Do not let an automation write files directly; route through Artifacts and MergeManager.

Do not hide logic gates; show data and control flow with distinct edge styles.

Do not run an Ultra automation without a pre-run cost warning when a budget is configured.

# Related Documents

- [[Templates-Part01]]
- [[PermissionManager-Part01]]
