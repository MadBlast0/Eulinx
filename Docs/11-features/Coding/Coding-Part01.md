---
title: Coding Specification - Part 01
status: draft
version: 1.0
tags:
  - features
  - coding
related:
  - "[[11-features/README]]"
  - "[[Coding-Part02]]"
  - "[[WorkflowEngine-Part01]]"
  - "[[ArtifactManager-Part01]]"
  - "[[LockManager-Part01]]"
---

# Coding Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and the Coding Feature Model
Part 02 - Agentic Coding Loop and Multi-File Refactors
Part 03 - Inline Editor, Diffs, and Artifact Review
Part 04 - PR / Commit Automation and Release Notes
Part 05 - Refinement on Code, Safety, and AI Notes

# Purpose

The Coding feature is Eulinx's highest-demand capability. It turns the node graph and worker terminals into a real software-engineering environment where agents plan, implement, verify, and refine changes to the user's project.

Coding is not a chat that prints code. It is an execution surface: agents run inside real terminals (Rust PTY), call build/lint/test tools, and produce changes as Artifacts that are verified and merged.

# Scope

The Coding feature operates strictly within the active workspace's project folder by default.

It MUST respect `.gitignore` and MUST NOT touch files outside the workspace unless the user explicitly grants broader scope through the PermissionManager.

It MUST treat every file as owned by the LockManager and every change as an Artifact produced in a worker sandbox.

# The Coding Feature Model

```text
User Goal
  -> Orchestrator decomposes
  -> Worker sandboxes (isolated)
  -> Edit Artifacts (not the live tree)
  -> Verifier (build / lint / test)
  -> MergeManager
  -> Workspace
```

# What Coding Owns

The coding feature owns:

- the agentic coding loop UI and controls
- the inline editor and diff viewer surfaces
- the PR / commit automation flow
- the mapping of refinement modes onto code quality
- the safety rails that prevent two workers from corrupting the same file

It does NOT own the terminal runtime, the merge algorithm, or the lock store. Those are Runtime services.

# Related Documents

- [[Coding-Part02]]
- [[WorkflowEngine-Part01]]
- [[ArtifactManager-Part01]]
- [[LockManager-Part01]]
