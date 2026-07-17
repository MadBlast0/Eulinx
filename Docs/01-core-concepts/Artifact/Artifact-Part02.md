---
title: ArtifactSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - artifact
related:
  - "[[01-core-concepts/README]]"
  - "[Artifact-Part01]"
  - "[Artifact-Part01]"
---
# Artifact Specification (Part 02)

## Verification

Every Artifact SHOULD pass through verification before it influences the Workspace.

Verification methods include:

- AI Review
- Human Review
- Static Analysis
- Unit Tests
- Integration Tests
- Policy Validation
- Security Scans

---

## Status

Artifacts may exist in these states:

- Draft
- Pending Verification
- Verified
- Rejected
- Approved
- Archived

Only Approved Artifacts may be merged.

---

## Relationships

Artifacts may reference:

- Parent Artifact
- Source Task
- Source Worker
- Source Orchestrator
- Related Artifacts
- Workspace Snapshot

---

## Versioning

Artifacts are immutable.

New changes create new versions instead of modifying existing ones.

Every version should preserve:

- Timestamp
- Creator
- Change Summary
- Verification Status

---

## Storage

Artifacts SHOULD be stored independently from project files to support replay, auditing and rollback.

---

## AI Notes

Artifacts are the source of truth for execution results.
Workers exchange Artifacts rather than raw conversation history whenever possible.

