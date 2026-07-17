---
title: Merge Manager Part 04 - Conflict Detection and Resolution
status: draft
version: 1.0
tags:
  - runtime
  - merge-manager
  - conflicts
related:
  - "[[LockManager-Part01]]"
  - "[[Artifact-Part01]]"
---

# Merge Manager Part 04 - Conflict Detection and Resolution

## Purpose

This part defines how MergeManager detects and resolves conflicts between candidate changes and current project state.

## Conflict Types

```text
base_revision_mismatch
same_line_conflict
file_deleted
file_renamed
symbol_modified
dependency_conflict
generated_file_exists
permission_conflict
lock_conflict
```

## Conflict Flow

```text
Candidate patch
  |
  v
Compare base revision to current workspace
  |
  +-- clean -> continue
  +-- conflict -> resolve or require human
```

## Resolution Strategies

```text
auto_rebase
three_way_merge
worker_repair
reviewer_worker
human_merge
reject
```

## Rule

MergeManager MUST NOT silently discard changes from another Worker.

## AI Notes

If conflict resolution uses an AI Worker, that Worker produces a new Artifact. It does not directly edit trusted files.

