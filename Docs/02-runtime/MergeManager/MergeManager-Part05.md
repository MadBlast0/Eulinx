---
title: Merge Manager Part 05 - Apply, Rollback, History
status: draft
version: 1.0
tags:
  - runtime
  - merge-manager
  - rollback
related:
  - "[[WorkspaceManager-Part01]]"
  - "[[EventBus-Part01]]"
---

# Merge Manager Part 05 - Apply, Rollback, History

## Purpose

This part defines safe patch application and rollback behavior.

## Apply Flow

```text
Acquire locks
Create pre-merge snapshot
Dry-run patch
Apply patch
Verify workspace state
Record history
Release locks
Emit event
```

## Rollback

Rollback MUST be possible for failed or partially applied merges.

Rollback data SHOULD include:

- affected paths
- old content hashes
- old file content or snapshot refs
- patch id
- merge id
- timestamp

## History

Every merge MUST produce history:

```text
mergeId
candidateId
artifactId
workerId
taskId
affectedPaths
verificationIds
permissionDecisionId
lockIds
result
createdAt
```

## AI Notes

Patch application should feel ceremonial: lock, snapshot, dry run, apply, verify, record. That ritual prevents subtle data loss.

