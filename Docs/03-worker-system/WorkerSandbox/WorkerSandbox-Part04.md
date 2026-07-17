---
title: WorkerSandbox Specification - Part 04
status: draft
version: 1.0
tags:
  - worker-system
  - worker-sandbox
  - artifacts
related:
  - "[[WorkerSandbox-Part03]]"
  - "[[ArtifactManager-Part01]]"
---

# WorkerSandbox Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, and Sandbox Types
Part 02 - Filesystem, Process, Network, and Secret Isolation
Part 03 - Sandbox Lifecycle and Worker Binding
Part 04 - Patch Extraction, Artifact Flow, and Cleanup
Part 05 - Events, UI, and Implementation Checklist

# Patch Extraction

Sandbox changes should become patch artifacts before merge.

Flow:

```text
Worker modifies sandbox
  |
  v
Runtime computes diff
  |
  v
ArtifactManager creates patch artifact
  |
  v
Verifier checks patch
  |
  v
MergeManager applies if approved
```

# Cleanup

Cleanup should preserve:

- useful logs
- generated artifacts
- diff summary
- failure reports

Temporary files can be deleted after retention period.

# AI Notes

Never copy sandbox changes into the project directly without Artifact and Merge flow.

# Related Documents

- [[WorkerSandbox-Part05]]
- [[ArtifactManager-Part01]]
- [[MergeManager-Part01]]

