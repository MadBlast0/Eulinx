---
title: ArtifactLifecycle Specification - Part 01
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-lifecycle
  - lifecycle
related:
  - "[[05-artifacts/README]]"
  - "[[ArtifactLifecycle-Diagrams]]"
  - "[[ArtifactArchitecture-Part01]]"
---

# ArtifactLifecycle Specification (Part 01)

## Document Index

Part 01 - Purpose, the lifecycle state machine, and the boundary rule
Part 02 - Creation by Builder/Worker and validation
Part 03 - Verification entry and the verified state
Part 04 - Approval gates and human-in-the-loop
Part 05 - Merge and the merged state
Part 06 - Expiry, archival, and garbage collection

# Purpose

ArtifactLifecycle defines the state machine every Artifact moves through, from the moment a Builder or Worker produces it to the moment it is merged, rejected, archived, or expired.

The lifecycle is what turns a loose output into a governed object. Each transition is a deliberate step with prerequisites, and each step emits events that the UI, memory, and replay consume.

# The Lifecycle State Machine

An Artifact's `status` field moves through these states:

- `draft`: the Artifact is being assembled by the producer; bytes and metadata may not yet be complete.
- `created`: the ArtifactManager has stored it, assigned `id`, computed `contentHash`, and set provenance. It is now immutable.
- `validated`: the ArtifactManager has confirmed the bytes satisfy the kind's structural rules.
- `verified`: a Verifier has produced a passing verdict (see Verification).
- `rejected`: a Verifier produced a failing verdict, or validation failed, and the Artifact will not be merged.
- `merged`: the MergeManager has applied it to trusted project state.
- `archived`: the Artifact is retained for audit/replay but is no longer an active candidate.

# Legal Transitions

```text
draft --(stored + hashed)--> created
created --(structural check passes)--> validated
created --(structural check fails)--> rejected
validated --(verdict pass)--> verified
validated --(verdict fail)--> rejected
verified --(merge applies)--> merged
verified --(merge blocked / conflict unresolved)--> rejected
verified --(expired before merge)--> archived
merged --(retention policy)--> archived
rejected --(retention policy)--> archived
```

A transition MAY be skipped only in well-defined cases (for example a non-mergeable kind such as `log` may go `created` directly to `archived` once consumed). Forward motion is the rule; a `created` Artifact MUST NOT go back to `draft`.

# The Boundary Rule Restated

The lifecycle enforces the central Eulinx rule: an Artifact reaches `merged` only through verification and the MergeManager. No state transition may write to trusted project state except the `verified -> merged` transition performed by the MergeManager.

# Events Emitted

Each transition emits an EventBus event:

- `artifact.created`
- `artifact.validated`
- `artifact.verified`
- `artifact.rejected`
- `artifact.merged`
- `artifact.archived`

Downstream nodes (Verifier, MergeManager, UI panels) subscribe to these to drive the graph and the UI.

# Invariants

```text
created is the point of immutability.
verified requires a passing Verdict, never an assumption.
merged requires verified, never bypassed.
rejected is terminal for merging (it cannot later become merged).
archived preserves the Artifact for replay and audit.
no transition writes trusted state except verified -> merged via MergeManager.
```

# AI Notes

Do not let a Worker mark its own Artifact `verified`. Verification is a separate stage performed by a Verifier, and the Verifier MUST NOT be the producer.

Do not treat `rejected` as a soft state. A rejected Artifact is not going to be merged; route it to fix-and-resubmit or discard.

Do not skip `created` and write bytes straight into `merged`. That is the "Worker already edited the file" anti-pattern the whole model exists to prevent.

# Related Documents

- [[05-artifacts/README]]
- [[ArtifactLifecycle-Part02]]
- [[ArtifactLifecycle-Diagrams]]
- [[ArtifactArchitecture-Part01]]
- [[Verification-Part01]]
- [[MergeFlow-Part01]]
