---
title: FutureIdeas Specification - Part 02
status: draft
version: 1.0
tags:
  - roadmap
  - future
  - marketplace
  - plugins
related:
  - "[[FutureIdeas-Part01]]"
  - "[[Backlog-Part01]]"
---

# FutureIdeas Specification (Part 02)

## Document Index

Part 01 - Knowledge Base, Replay, Snapshots, Simulation Mode
Part 02 - Marketplace, Collaboration, Plugin SDK, and Scheduling

# Marketplace

Share workflows, agent teams, prompts, plugins, and templates. The primary community/growth engine.

Why: the n8n advantage is its template gallery; Eulinx needs a gallery for traction. Free tier is read-only; Plus/Pro can publish.

Depends on: Artifact import/export (Phase 3), Workflow templates (Phase 4), Accounts/sync (future).

# Collaboration and Team Share

Encrypted cross-device sync and team-shared workspaces (Pro tier). Not a hosted multiplayer engine in v1; sync over encrypted object storage.

Why: supports the tertiary audience and team use without a required backend.

Depends on: Workspace isolation (Phase 3), Snapshots (FutureIdeas Part 01), optional accounts (Phase 4/future).

# Plugin SDK

A full plugin SDK (not just hooks) letting third parties add node types, providers, tools, and panels. Extends the Tool System and MCP (Phase 3).

Why: turns Eulinx into an extensible platform; avoids bespoke integrations for every capability.

Depends on: Tool Registry (Phase 3), Event Bus (Phase 1), Workflow node types (Phase 4).

# Advanced Scheduling and Triggers

Richer triggers (webhook, "when agent X outputs Y"), recurring automations, and distributed agents (remote VM/SSH/Kubernetes execution targets beyond the local PTY).

Why: broadens from "AI operating room" to full automation platform.

Depends on: Scheduler (Phase 1), Workflow triggers (Phase 4), Tool System (Phase 3).

# Promotion Rule

A FutureIdea becomes a phase item when: (1) a concrete user need is validated, (2) its dependencies are shipped, and (3) it fits the next planning window. Until then it stays here, not in the Backlog churn.

# Related Documents

- [[FutureIdeas-Part01]]
- [[Backlog-Part01]]
- [[Phase4-Part03]]
- [[09-plugin-system/README]]
