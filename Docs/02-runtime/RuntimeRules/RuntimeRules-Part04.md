---
title: RuntimeRules Specification - Part 04
status: draft
version: 1.0
tags:
  - runtime
  - rules
  - implementation
related:
  - "[[RuntimeRules-Part03]]"
  - "[[ArchitectureRules]]"
---

# RuntimeRules Specification (Part 04)

## Document Index

Part 01 - Runtime Invariants and Non-Negotiable Rules
Part 02 - Service Boundaries, Mutation Rules, and Safety Gates
Part 03 - Error Handling, Observability, and Recovery Rules
Part 04 - Implementation Checklist, Anti-Patterns, and Future Expansion

# Purpose

This part defines implementation checklists, anti-patterns, tests, and future expansion for RuntimeRules.

# Implementation Checklist

- [ ] Define runtime invariant list in code.
- [ ] Add service boundary documentation.
- [ ] Add typed runtime errors.
- [ ] Add event emission requirements.
- [ ] Add deny-by-default permission behavior.
- [ ] Add Workspace boundary checks.
- [ ] Add ToolRegistry-only tool invocation.
- [ ] Add ProcessLifecycle-only process launch.
- [ ] Add MergeManager-only project mutation.
- [ ] Add LockManager conflict checks.
- [ ] Add RuntimeManager degraded state.
- [ ] Add tests for boundary violations.
- [ ] Add tests for fail-closed behavior.
- [ ] Add implementation guide for AI assistants.

# Anti-Patterns

Avoid these:

```text
UI directly starts a terminal process.
Worker directly writes project files.
Workflow node directly invokes external CLI.
Tool call skips PermissionManager.
Merge applies without lock.
Runtime service mutates another service's database rows.
Errors are swallowed because they are inconvenient.
AI output becomes executable command text.
```

# Testing Rules

RuntimeRules tests SHOULD verify:

- unsafe actions are denied
- missing permissions fail closed
- unknown Workspace fails closed
- process launch requires ProcessLifecycle
- tool invocation requires ToolRegistry
- project mutation requires MergeManager
- important actions emit events
- recovery does not resume unknown processes

# AI Implementation Notes

When using a lower-cost coding model, give it this rule:

```text
If you are about to write code that directly changes files, starts a process, invokes a tool, grants permission, or mutates runtime state, stop and route that action through the proper runtime service.
```

# Future Expansion

Future RuntimeRules may include:

- distributed runtime invariants
- remote Worker security rules
- organization policy rules
- plugin marketplace enforcement
- signed Tool manifests
- formal policy language
- runtime rule linting
- architecture test generation

# Summary

RuntimeRules is the guardrail layer for Eulinx's architecture.

It keeps Eulinx from becoming a pile of powerful shortcuts. Every shortcut around these rules increases risk, breaks replay, weakens permissions, and makes AI-generated code less reliable.

# Related Documents

- [[RuntimeRules-Part01]]
- [[RuntimeManager-Part01]]
- [[Permission-Part01]]
- [[ArchitectureRules]]
- [[AIInstructions]]

