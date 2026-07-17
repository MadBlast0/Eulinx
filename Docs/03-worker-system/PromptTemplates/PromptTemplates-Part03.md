---
title: PromptTemplates Specification - Part 03
status: draft
version: 1.0
tags:
  - worker-system
  - prompts
  - versioning
related:
  - "[[PromptTemplates-Part02]]"
---

# PromptTemplates Specification (Part 03)

## Document Index

Part 01 - Purpose, Template Types, and Structure
Part 02 - Worker Instructions, Output Contracts, and Constraints
Part 03 - Variables, Versioning, Testing, and Reuse
Part 04 - UI, Events, and Implementation Checklist

# Variables

Template variables may include:

```text
task_title
task_description
workspace_summary
artifact_refs
allowed_tools
permission_profile
output_contract
stop_condition
```

# Versioning

Prompt templates should be versioned.

Executions should record which prompt template version was used.

# Testing

Prompt templates should be tested with:

- small tasks
- failed tasks
- permission-limited tasks
- handoff tasks
- review tasks

# Reuse

Templates may become marketplace items later.

# AI Notes

Do not silently change prompt behavior without versioning.

# Related Documents

- [[PromptTemplates-Part04]]
- [[Prompt-Part01]]

