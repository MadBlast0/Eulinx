---
title: Phase3 Specification - Part 03
status: draft
version: 1.0
tags:
  - roadmap
  - phase3
  - security
related:
  - "[[Phase3-Part01]]"
  - "[[Phase3-Part02]]"
  - "[[Phase4-Part01]]"
---

# Phase3 Specification (Part 03)

## Document Index

Part 01 - Purpose, Scope, and Artifact System
Part 02 - Providers, Prompts, and Tool System
Part 03 - Security, Completion, and Handoff

# Security

Security is the guardrail that makes autonomous workers safe. It is built in Phase 3, alongside the capabilities they gate.

Components:

- Permission Manager: per-worker allow/deny for filesystem read/write/delete, git, terminal, browser, docker, SSH, internet, auto-approve/YOLO mode, MCP access.
- Approval System: human-in-the-loop gates on destructive actions (push, delete, publish) — an architectural rule, not optional.
- Secret Manager: provider keys in OS secure store; never logged or injected into context.
- Policy Engine: evaluates requests against workspace/session/plan policies.
- Sandboxing + Isolation: workspace isolation and session isolation keep projects from interfering.
- Auditing: sensitive reads/writes are recorded.
- Authentication/Authorization: local-first, with optional account for sync (Phase 4/future).

# Why Security With Capabilities

Tools (Part 02) and Permissions (Part 03) are co-designed. A tool declares required permissions; the Permission Manager enforces them before execution. This prevents the "AI gets everything by default" failure mode.

# Acceptance for Phase 3

Artifact System stores, versions, searches, and imports/exports artifacts; dependency graph is queryable.

Provider Manager streams from multiple providers; Model Profiles map to concrete models; keys stay in secure store.

Prompt Manager versions/templates/validates prompts and builds context.

Tool Registry exposes filesystem/git/terminal/browser/HTTP/database/Docker/MCP; tools require declared permissions.

Security enforces per-worker permissions, approval gates, isolation, auditing, and secret safety.

# Build Order Within Phase 3

1. Artifact System.
2. Provider Manager + Model Profiles.
3. Prompt Manager.
4. Tool System + Tool Registry + MCP.
5. Security (permissions, approval, secrets, policy, isolation, audit).

# Risks

Permission sprawl: keep the permission set small and explicit; do not let workers escalate silently.

MCP supply chain: enabled MCP servers run code; treat them as untrusted by default.

Secret leakage: auditing MUST flag any attempt to read provider keys.

# Handoff to Phase 4

With capabilities and safety in place, Phase 4 adds Orchestrators (the planning/coordination AI layer), the Workflow Engine, CLI, full UI, and Observability — turning the engine into a usable desktop studio.

# Related Documents

- [[Phase4-Part01]]
- [[Phase3-Part01]]
- [[02-runtime/README]]
- [[12-development/README]]
