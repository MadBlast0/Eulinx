---
title: PermissionSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - permissions
related:
  - "[[01-core-concepts/README]]"
  - "[[Worker-Part01]]"
  - "[[Runtime-Part01]]"
  - "[[Workflow-Part01]]"
---

# Permission Specification (Part 01)

## Document Index

Part 01 — Purpose, Philosophy, Architecture
Part 02 — Permission Registry & Scopes
Part 03 — Permission Policies
Part 04 — Runtime Enforcement
Part 05 — Worker & Tool Permissions
Part 06 — Sessions, Workspaces & Projects
Part 07 — Auditing & Security
Part 08 — Database, UI & Implementation

---

# Purpose

Permissions define what every Runtime component is allowed to do.

Permissions are enforced by the Runtime before any potentially unsafe action is executed.

Workers never grant themselves permissions.

---

# Philosophy

Reasoning and authorization are separate concerns.

AI decides *what it wants to do*.

The Runtime decides *whether it is allowed*.

---

# Core Architecture

Worker
↓
Runtime
↓
Permission Manager
↓
Policy Engine
↓
Decision
↓
Allow / Deny

---

# Responsibilities

The Permission System MUST:

- Enforce Workspace isolation
- Validate every Tool invocation
- Protect secrets
- Protect the filesystem
- Control terminal access
- Support auditing
- Support approval gates

---

# Permission Categories

- Filesystem
- Terminal
- Network
- Browser
- Git
- Database
- MCP
- Secrets
- Environment
- Process Control

## AI Notes

Permissions are infrastructure objects owned entirely by the Runtime.

Workers request actions; only the Runtime authorizes them.

