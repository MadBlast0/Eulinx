---
title: Git Specification - Part 03
status: draft
version: 1.0
tags:
  - features
  - git
related:
  - "[[Git-Part02]]"
  - "[[Git-Part04]]"
  - "[[PermissionManager-Part01]]"
---

# Git Specification (Part 03)

## Document Index

Part 01 - Purpose, Scope, and the Git Panel
Part 02 - Status, Stage, Commit, Push, Diff, History
Part 03 - Agent-Driven Git Operations
Part 04 - PR Automation and Safety Gates

# Agent-Driven Git Operations

An agent may perform git operations through a granted tool. Supported agent operations:

- status, diff, log (read)
- add, commit (write, scoped)
- branch create (write, scoped)
- push, pull (network, gated)

Every operation MUST pass through the PermissionManager. An agent without the `git_push` grant cannot push, even if its terminal could technically run the command; the capability grant is the authority, not the shell.

# Consistency with Artifacts

When a worker's Artifact is merged into the tree, the resulting file change is visible in the Git panel as a working-tree modification. Git and the Artifact/Merge system observe the same filesystem; they do not conflict because the MergeManager is the single writer.

# Related Documents

- [[Git-Part04]]
- [[PermissionManager-Part01]]
