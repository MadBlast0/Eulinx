---
title: ArtifactLifecycle Specification - Part 06
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-lifecycle
  - retention
related:
  - "[[ArtifactLifecycle-Part05]]"
  - "[[04-memory/History/History-Part01]]"
---

# ArtifactLifecycle Specification (Part 06)

## Document Index

Part 01 - Purpose, the lifecycle state machine, and the boundary rule
Part 02 - Creation by Builder/Worker and validation
Part 03 - Verification entry and the verified state
Part 04 - Approval gates and human-in-the-loop
Part 05 - Merge and the merged state
Part 06 - Expiry, archival, and garbage collection

# Expiry

An Artifact MAY carry `expiresAt`. After that time, if it has not been merged, it becomes a candidate for archival. Expiry exists because a proposed change from a stale run may no longer be safe to apply to a moved-on workspace.

Expiry rules:

- a `merged` Artifact is never expired; it is retained for audit.
- a `verified` but unmerged Artifact past `expiresAt` transitions to `archived` with reason `expired`.
- a `rejected` Artifact past `expiresAt` transitions to `archived` with reason `rejected_expired`.
- expiry MUST NOT delete the Artifact's bytes while any replay record or merge_result references them.

# Archival

Archival (`merged -> archived`, `rejected -> archived`, `verified-expired -> archived`) moves the Artifact out of the active candidate set but preserves it. Archived Artifacts:

- remain resolvable by `artifact-ref` for replay and audit
- remain searchable in history ([[04-memory/History/History-Part01]])
- keep their `contentHash` and verdicts intact
- are excluded from "pending merge" and "needs verification" queues

# Garbage Collection

Garbage collection removes bytes only when safe. The collector MUST NOT delete:

- any Artifact referenced by a Replay session
- any Artifact referenced by a `merge_result` or `verification_result`
- any `secret` Artifact until its retention policy elapses and it is securely wiped
- any Artifact whose `expiresAt` has not passed

For large binary `image` Artifacts, the collector MAY drop the rendered bytes while keeping the metadata and a thumbnail, provided the Artifact is archived and unreferenced by replay.

# Retention Policy

Retention is per workspace and configurable. Sensitive and secret Artifacts SHOULD have shorter retention and MUST be wiped, not merely deleted, when their policy elapses. Public/internal Artifacts MAY be retained indefinitely for knowledge-base use.

# Invariants

```text
Merged Artifacts are never expired.
Expiry archives, it does not silently delete.
GC never removes bytes referenced by replay or results.
Secret Artifacts are wiped, not just deleted.
Archived Artifacts stay resolvable for audit.
```

# AI Notes

Do not let expiry delete an Artifact that Replay still needs. Replay reconstructs executions from Artifact references; deleting them breaks time travel.

Do not keep secret Artifacts forever by default. Apply the retention policy and wipe them securely.

Do not archive an Artifact and then lose its verdicts. Archival preserves the record; it is not deletion.

# Related Documents

- [[ArtifactLifecycle-Part05]]
- [[04-memory/History/History-Part01]]
- [[04-memory/Replay/Replay-Part01]]
- [[ImageArtifacts-Part01]]
