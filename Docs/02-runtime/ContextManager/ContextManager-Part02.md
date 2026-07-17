---
title: Context Manager Part 02 - Context Packages
status: draft
version: 1.0
tags:
  - runtime
  - context-manager
related:
  - "[[Artifact-Part01]]"
  - "[[Task-Part01]]"
---

# Context Manager Part 02 - Context Packages

## Context Package

```text
ContextPackage
  id
  workspaceId
  projectId
  actorId
  taskId
  purpose
  includedMemories
  includedArtifacts
  includedFiles
  includedInstructions
  redactions
  tokenEstimate
  createdAt
```

## Source Types

Context may include:

- task description
- phase summary
- parent orchestrator instructions
- relevant Artifacts
- selected file excerpts
- memory summaries
- tool instructions
- permission limits
- expected output format

## Selection Rule

ContextManager SHOULD prefer structured Artifacts and summaries over raw transcript history.

## AI Notes

If a Worker needs code, send the exact file or excerpt. If it needs intent, send the Artifact summary. Do not send everything just in case.

