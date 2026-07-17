---
title: PromptTemplates Specification - Part 02
status: draft
version: 1.0
tags:
  - worker-system
  - prompts
  - output-contracts
related:
  - "[[PromptTemplates-Part01]]"
---

# PromptTemplates Specification (Part 02)

## Document Index

Part 01 - Purpose, Template Types, and Structure
Part 02 - Worker Instructions, Output Contracts, and Constraints
Part 03 - Variables, Versioning, Testing, and Reuse
Part 04 - UI, Events, and Implementation Checklist

# Worker Prompt Sections

Recommended sections:

```text
Role in this task
Objective
Context package
Allowed tools
Permissions
Files in scope
Output contract
Stop condition
Safety rules
```

# Output Contracts

Workers should know what to produce.

Examples:

```text
patch artifact
review artifact
test report
summary
handoff package
```

# Constraints

Prompts should include:

- do not edit outside scope
- produce artifact before claiming done
- ask if blocked
- do not expose secrets
- do not spawn child Workers unless allowed

# AI Notes

The output contract is as important as the prompt objective.

# Related Documents

- [[PromptTemplates-Part03]]
- [[ArtifactManager-Part01]]

