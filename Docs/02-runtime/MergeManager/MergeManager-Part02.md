---
title: Merge Manager Part 02 - Patch Intake and Eligibility
status: draft
version: 1.0
tags:
  - runtime
  - merge-manager
  - patches
related:
  - "[[ArtifactManager-Part01]]"
  - "[[Artifact-Part01]]"
---

# Merge Manager Part 02 - Patch Intake and Eligibility

## Purpose

This part defines how MergeManager receives candidate changes and decides whether they are eligible for merging.

## Merge Candidate

```text
MergeCandidate
  id
  artifactId
  workspaceId
  projectId
  sourceWorkerId
  taskId
  affectedPaths
  patchFormat
  baseRevision
  verificationStatus
  riskLevel
```

## Eligibility Requirements

A candidate MUST:

- belong to the active workspace
- target paths inside the project boundary
- have a known source Worker or Tool
- have a base revision
- be stored as an Artifact
- pass schema validation
- have no unresolved critical verification failure

## Patch Formats

Eulinx MAY support:

```text
unified_diff
structured_patch
file_replacement
generated_file
delete_file
rename_file
```

Risk increases from generated file to delete/rename operations.

## Intake Flow

```text
Artifact created
  |
  v
ArtifactManager validates schema
  |
  v
MergeManager creates MergeCandidate
  |
  v
Eligibility checks
  |
  v
Ready for verification or rejected
```

## AI Notes

Do not merge raw text just because it "looks like code." Require structured patch metadata.

