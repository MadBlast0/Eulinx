---
title: ArtifactManager Specification - Part 05
status: draft
version: 1.0
tags:
  - runtime
  - artifact-manager
  - safety
related:
  - "[[ArtifactManager-Part04]]"
  - "[[Permission-Part01]]"
---

# ArtifactManager Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, and Responsibilities
Part 02 - Artifact Types, Metadata, and Storage
Part 03 - Creation, Validation, Routing, and Versioning
Part 04 - Artifact Relationships, Indexing, and Search
Part 05 - Safety, Permissions, Retention, and Integrity
Part 06 - Implementation Checklist, Events, and Future Expansion

# Safety Goals

ArtifactManager must protect artifacts from:

- tampering
- accidental overwrite
- unsafe merge
- secret leakage
- cross-workspace access
- deletion without audit

# Integrity

Artifacts SHOULD store checksums.

Patch artifacts SHOULD be immutable after validation.

MergeManager should verify checksum before applying patches.

# Permission Checks

Permission checks are required for:

- artifact.create
- artifact.read
- artifact.update
- artifact.verify
- artifact.merge
- artifact.delete

# Retention

Artifacts may have retention policies:

```text
keep_forever
keep_until_session_end
keep_until_execution_end
keep_latest_only
manual_delete
```

Patch, merge, verification, and audit-related artifacts SHOULD be retained longer than temporary logs.

# Sensitive Artifacts

Sensitive artifacts should be redacted or restricted.

Examples:

- logs containing environment variables
- screenshots with private data
- output from secret-related tools
- database dumps

# AI Notes

Do not let artifact deletion erase the history of important project changes.

Artifact safety is part of user trust.

# Related Documents

- [[ArtifactManager-Part06]]
- [[Permission-Part01]]
- [[MergeManager-Part01]]

