---
title: JSONArtifacts Specification - Part 02
status: draft
version: 1.0
tags:
  - artifacts
  - json-artifacts
  - merge
related:
  - "[[JSONArtifacts-Part01]]"
  - "[[MergeFlow-Part04]]"
---

# JSONArtifacts Specification (Part 02)

## Document Index

Part 01 - What a JSON Artifact IS, schema obligations, and validation
Part 02 - Merge semantics for config and data

# Merge Semantics

A JSON Artifact destined to become project state (for example a config file) is merged by writing its parsed content to `targetPath` via the MergeManager. Merge rules:

- the target path MUST be within the workspace
- overwriting an existing file is a modification; the MergeManager records the prior content for rollback
- applying config SHOULD require an approval gate when the config affects build, runtime, or external services
- a JSON Artifact that fails schema MUST NOT be merged

# Structural Merge Versus Full Replace

For config, a full replace is the default (write the whole file). Eulinx MAY support a structural merge (deep-merge keys) when the Artifact declares `mergeMode: deep`, but deep merge is riskier and MUST be explicit and approval-gated, because it can silently combine incompatible settings. When in doubt, full replace is preferred and safer.

# Data Versus Config

Not all JSON Artifacts are merge candidates:

- a web-search result JSON is data for context, not project state; it is consumed by a Worker and archived, never merged
- a settings JSON IS project state and follows the merge rules above
- the Artifact's intent (declared in metadata or by the producing node) determines whether merge is even attempted

# Conflicts

Two JSON Artifacts targeting the same config file:

- if both full-replace, the later merge wins only after the earlier is recorded; a concurrent attempt is a lock conflict
- if one is deep-merge and the other full-replace, that is a conflict in intent and MUST be escalated
- key-level overlaps in deep merge are reported as conflicts per key

# Invariants

```text
Config JSON is merged via MergeManager, never directly.
Schema failure blocks merge.
Deep merge is explicit, approval-gated, and conflict-aware.
Data JSON is consumed, not merged.
```

# AI Notes

Do not deep-merge JSON configs by default. Full replace is safer and more predictable for a cheap coding model to reason about.

Do not merge a JSON Artifact that failed schema. Malformed config can break the build or leak settings.

Do not treat a search-result JSON as mergeable. It is context data; merging it into the project would be a bug.

# Related Documents

- [[JSONArtifacts-Part01]]
- [[MergeFlow-Part04]]
- [[MergeFlow-Part03]]
- [[ArtifactLifecycle-Part04]]
- [[02-runtime/PermissionManager/PermissionManager-Part01]]
