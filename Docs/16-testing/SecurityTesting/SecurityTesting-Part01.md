---
title: SecurityTesting Specification - Part 01
status: draft
version: 1.0
tags:
  - testing
  - security-testing
  - sandbox
related:
  - "[[16-testing/README]]"
  - "[[SecurityTesting-Part02]]"
---

# SecurityTesting Specification (Part 01)

## Document Index

Part 01 - Threat Model and Refusal-First Policy
Part 02 - Sandbox and Permission Testing
Part 03 - Plugin Boundary Testing
Part 04 - Secrets, Redaction, and Adversarial Input

# Purpose

SecurityTesting verifies that Eulinx's sandbox, permission model, and plugin boundary actually refuse what they claim to refuse. In a multi-agent system where Workers can run code and call tools, a missing denial is a data-loss or escape incident.

Security tests are refusal-first: for every granted capability there MUST be a mirrored test that the same action is refused when the permission is absent.

# Threat Model

Eulinx must defend against:

- a Worker exceeding its filesystem scope (escaping the workspace),
- a Worker performing a destructive action (delete, git push, publish) without approval,
- a plugin escaping its boundary and touching host internals,
- a prompt or artifact smuggling secrets into shared memory,
- a malicious or malformed model output triggering unsafe execution,
- cross-workspace leakage of memory or artifacts.

# Refusal-First Policy

For every permission (Read Files, Write Files, Delete Files, Git Push, Browser, Terminal, Docker, SSH, Internet, MCP Access, Auto Approve, YOLO Mode — per ChatHistory), there MUST be:

- a `should_...` test proving the action succeeds when granted,
- a `refuses_...` test proving the action is denied when absent,
- a test proving a human-approval gate blocks destructive actions until approved.

# Related Documents

- [[SecurityTesting-Part02]]
- [[02-runtime/PermissionManager-Part01]]
