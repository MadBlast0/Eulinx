---
title: ArtifactManager Specification - Part 02
status: draft
version: 1.0
tags:
  - runtime
  - artifact-manager
  - artifact-types
related:
  - "[[ArtifactManager-Part01]]"
  - "[[Artifact-Part01]]"
---

# ArtifactManager Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and Responsibilities
Part 02 - Artifact Types, Metadata, and Storage
Part 03 - Creation, Validation, Routing, and Versioning
Part 04 - Artifact Relationships, Indexing, and Search
Part 05 - Safety, Permissions, Retention, and Integrity
Part 06 - Implementation Checklist, Events, and Future Expansion

# Artifact Types

Eulinx SHOULD support:

```text
plan
task_list
patch
code
markdown
json
test_report
log
screenshot
diagram
prompt
model_response
review
verification_result
merge_result
```

# Artifact Object

```ts
type Artifact = {
  id: string;
  workspaceId: string;
  projectId?: string;
  sessionId?: string;
  executionId?: string;
  workflowId?: string;
  taskId?: string;
  workerId?: string;
  type: string;
  title: string;
  description?: string;
  contentRef: string;
  contentType: string;
  status: "draft" | "created" | "validated" | "verified" | "rejected" | "merged" | "archived";
  version: number;
  parentArtifactId?: string;
  sensitivity: "public" | "internal" | "sensitive" | "secret";
  createdAt: string;
  updatedAt: string;
};
```

# Storage Strategy

Small artifacts MAY be stored directly in SQLite.

Large artifacts SHOULD be stored as files with database metadata.

Patch artifacts SHOULD be stored immutably.

# Content References

```text
sqlite://artifact_content/{id}
file://workspace/.Eulinx/artifacts/{id}
blob://artifact-store/{id}
```

Implementation can choose actual storage format later, but Artifact references should remain stable.

# Metadata

Metadata SHOULD include:

- creator
- source Worker
- source Tool
- task
- workflow node
- version
- checksum
- sensitivity
- verification state
- merge state

# AI Notes

Do not make artifacts plain text files with no metadata.

The metadata is what lets Eulinx trace, verify, search, replay, and safely merge work.

# Related Documents

- [[ArtifactManager-Part03]]
- [[Artifact-Part01]]

