---
title: Tool Registry Part 03 - Invocation Pipeline
status: draft
version: 1.0
tags:
  - runtime
  - tool-registry
  - invocation
related:
  - "[[PermissionManager-Part01]]"
  - "[[ArtifactManager-Part01]]"
---

# Tool Registry Part 03 - Invocation Pipeline

## Pipeline

```text
receive invocation
validate tool exists
validate input schema
check permission
check rate/concurrency limits
invoke adapter
validate output schema
store output if artifact-worthy
emit event
return result
```

## Invocation Request

```text
toolId
actorId
workspaceId
projectId
sessionId
input
reason
timeout
```

## Result Types

```text
success
failure
permission_denied
validation_error
timeout
cancelled
partial
```

## AI Notes

Always validate model-produced tool arguments. The model is not the schema authority.

