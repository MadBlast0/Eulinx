---
title: MergeFlow Specification - Part 01
status: draft
version: 1.0
tags:
  - artifacts
  - merge-flow
  - merge-manager
related:
  - "[[05-artifacts/README]]"
  - "[[MergeFlow-Diagrams]]"
  - "[[02-runtime/MergeManager/MergeManager-Part01]]"
---

# MergeFlow Specification (Part 01)

## Document Index

Part 01 - Purpose, the fail-closed rule, and the merge pipeline
Part 02 - Eligibility, locks, and permission checks
Part 03 - Approval gates and human-in-the-loop
Part 04 - Conflict detection and resolution
Part 05 - Apply, rollback, and merge history
Part 06 - Git integration and workspace integrity

# Purpose

MergeFlow defines how the MergeManager applies a verified Artifact to trusted project state. It is the "Merge" in `Worker -> Artifact -> Verify -> Merge`, and the single place trusted state may change because of an Artifact.

# The Core Rule

```text
AI-generated changes become trusted project changes only through MergeManager.
```

No Builder, Worker, Tool, or other node may mutate trusted project state from an Artifact. The MergeManager is the gate, and it is fail-closed.

# Fail-Closed

Fail-closed is the overriding principle of MergeFlow:

- on any uncertainty, the merge stops and does NOT apply.
- a conflict that cannot be auto-resolved is escalated to a human, never force-applied.
- a lost lock, a disk error, or a partial write triggers rollback to the pre-merge state.
- a missing approval gate blocks the merge.
- the default answer to "should we apply?" is NO unless every check passes.

Fail-closed trades a little convenience for the guarantee that Eulinx never silently corrupts the user's project.

# The Merge Pipeline

A merge proceeds through ordered stages; each stage is a gate:

1. eligibility: the Artifact is `verified` (passed authoritative verification)
2. lock: acquire the lock on affected paths
3. permission: the producing Worker's permission profile allows the operation
4. approval: required human/approval gates are satisfied
5. conflict: no unresolvable conflict with current workspace state
6. apply: write the Artifact's content to declared paths
7. record: set `status = merged`, emit `artifact.merged`, write a `merge_result`

Any stage failing stops the pipeline and either rejects or escalates. Later parts detail each stage.

# What Merge Writes

Merge writes ONLY the content the Artifact declares, to the paths it declares. It does not run the producer's side effects, does not "also" execute commands, and does not touch files outside the Artifact's scope. The Artifact is the complete, self-contained description of the change.

# Invariants

```text
Only MergeManager applies Artifacts to trusted state.
Fail-closed: uncertainty => stop, do not apply.
Each pipeline stage is a gate; any failure stops the merge.
Merge writes only the Artifact's declared content to declared paths.
A merged Artifact is recorded with actor and timestamp.
```

# AI Notes

Do not let a node other than MergeManager write project state from an Artifact. The Builder proposes; the MergeManager applies. Anything else collapses the safety model.

Do not "apply and ask later". Apply only after every gate passes; when in doubt, stop.

Do not let a merge carry side effects. The Artifact describes the change; the merge applies the Artifact.

# Related Documents

- [[05-artifacts/README]]
- [[MergeFlow-Part02]]
- [[MergeFlow-Diagrams]]
- [[02-runtime/MergeManager/MergeManager-Part01]]
- [[ArtifactLifecycle-Part05]]
- [[Verification-Part01]]
