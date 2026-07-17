---
title: Git Specification - Part 04
status: draft
version: 1.0
tags:
  - features
  - git
related:
  - "[[Git-Part03]]"
  - "[[Coding-Part04]]"
---

# Git Specification (Part 04)

## Document Index

Part 01 - Purpose, Scope, and the Git Panel
Part 02 - Status, Stage, Commit, Push, Diff, History
Part 03 - Agent-Driven Git Operations
Part 04 - PR Automation and Safety Gates

# PR Automation

The git feature automates pull-request creation. After accepted Artifacts are committed, an agent can open a PR through a git provider integration. PR creation is a network/external action and MUST be approval-gated.

# Safety Gates

- push: explicit human approval required
- force-push / branch delete: explicit approval and high-risk flag
- PR open to external repo: approval and capability grant
- commit of secrets: the feature SHOULD detect likely secrets in diffs and block or warn before commit

# AI Notes

Do not let an agent push without the `git_push` grant, regardless of terminal access.

Do not auto-open PRs; require an approval gate for external publish.

Do not treat git as separate from Artifacts; the MergeManager is the single writer to the tree.

# Related Documents

- [[Coding-Part04]]
