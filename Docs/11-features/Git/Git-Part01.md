---
title: Git Specification - Part 01
status: draft
version: 1.0
tags:
  - features
  - git
related:
  - "[[11-features/README]]"
  - "[[Git-Part02]]"
  - "[[Coding-Part04]]"
---

# Git Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and the Git Panel
Part 02 - Status, Stage, Commit, Push, Diff, History
Part 03 - Agent-Driven Git Operations
Part 04 - PR Automation and Safety Gates

# Purpose

The Git feature is a project-scoped git panel in the right sidebar (like VS Code Source Control) plus agent-driven git operations. It lets users and agents stage, commit, push, diff, and review history — all scoped to the active workspace folder.

Git operations that change the tree MUST go through the Artifact/Merge path so they remain consistent with worker-produced changes.

# Scope

Git is scoped to the active workspace's project folder. The panel shows only that repository. Cross-repository operations are out of scope for v1.

# The Git Panel

The Git panel is a UI surface showing:

- current branch and status
- changed, staged, and untracked files
- incoming/outgoing commits
- a diff viewer
- action buttons (stage, unstage, commit, push, pull, fetch)

The panel reads through the Rust FS/git service and reflects the same state the terminals see.

# What Git Owns

The git feature owns:

- the Source Control panel UI and actions
- the diff viewer for committed and working changes
- the agent git-operation API surface
- the PR automation flow

It does NOT own the merge algorithm for code (MergeManager) or the lock store (LockManager); those apply to file changes whether or not git is involved.

# Related Documents

- [[Git-Part02]]
- [[Coding-Part04]]
