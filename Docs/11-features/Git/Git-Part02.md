---
title: Git Specification - Part 02
status: draft
version: 1.0
tags:
  - features
  - git
related:
  - "[[Git-Part01]]"
  - "[[Git-Part03]]"
  - "[[ArtifactManager-Part01]]"
---

# Git Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and the Git Panel
Part 02 - Status, Stage, Commit, Push, Diff, History
Part 03 - Agent-Driven Git Operations
Part 04 - PR Automation and Safety Gates

# Status and Stage

The panel shows working-tree status. The user stages individual hunks or files. Staging is a UI action that maps to the git service; it does not modify files, only the index.

# Commit

Committing writes the staged index to a commit with a message. When an agent generates the message, it is produced from the actual diff and task context and reviewed like any Artifact. The commit itself is performed by the git service, not by hand-written shell in a worker unless explicitly permitted.

# Push, Pull, Fetch

Push, pull, and fetch are network actions and MUST be permission-gated. Push especially is destructive to shared state and requires explicit human approval (an approval gate), never automatic.

# Diff and History

The diff viewer renders committed and working changes with the same contract as the Coding diff surface (file, hunk, owner, verification status). History shows the commit log with author, message, and linked task/artifact where available.

# Related Documents

- [[Git-Part03]]
- [[ArtifactManager-Part01]]
