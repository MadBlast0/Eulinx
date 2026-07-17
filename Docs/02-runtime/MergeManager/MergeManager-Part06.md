---
title: Merge Manager Part 06 - Git and Workspace Integrity
status: draft
version: 1.0
tags:
  - runtime
  - merge-manager
  - git
related:
  - "[[WorkspaceManager-Part01]]"
  - "[[Project-Part01]]"
---

# Merge Manager Part 06 - Git and Workspace Integrity

## Purpose

This part defines how MergeManager interacts with Git and protects workspace integrity.

## Git Integration

Eulinx SHOULD treat Git as an external safety layer, not the only safety layer.

MergeManager MAY:

- inspect git status before merge
- create internal checkpoints
- create Git commits when configured
- attach merge metadata to commit messages
- block merge when working tree is unexpectedly dirty

## Dirty Workspace Rule

If files have changed outside Eulinx since candidate creation, MergeManager MUST re-check conflicts.

## Integrity Checks

```text
path boundary check
content hash check
base revision check
lock check
permission check
verification check
post-apply check
```

## AI Notes

Do not assume every user wants automatic Git commits. Make this configurable.

