---
title: Collaboration Specification - Part 03
status: draft
version: 1.0
tags:
  - features
  - collaboration
related:
  - "[[Collaboration-Part02]]"
  - "[[Collaboration-Part04]]"
  - "[[EventBus-Part01]]"
---

# Collaboration Specification (Part 03)

## Document Index

Part 01 - Purpose, Scope, and the Collaboration Model
Part 02 - Shared Workspaces and Sync
Part 03 - Artifact-Based Collaboration and Channels
Part 04 - Team Roles, Safety, and AI Notes

# Artifact-Based Collaboration

Humans and agents collaborate through Artifacts. A change is proposed as an Artifact, verified, and merged via MergeManager — exactly as in single-user mode. Concurrent participants never edit the live tree directly; they propose Artifacts, which serializes naturally through lock and merge.

This is the differentiator: collaboration is built on the same artifact/merge path that already prevents worker conflicts, so multi-human editing reuses the same safety rails.

# Shared Channels

Collaboration uses the memory bus channels: a global channel all participants read/post to, and partitioned channels for subgroups. Messages carry metadata (what was done, progress %) so participants get signal without noise. Selective injection applies: a participant receives the task plus relevant channel summaries plus the specific upstream output.

# Concurrency and Conflicts

When two participants propose conflicting Artifacts, the MergeManager's conflict detection routes to a human or orchestrator for manual merge — the same path as worker conflicts. Collaboration does not need a separate OT/CRDT layer because writes go through Artifacts, not direct tree mutation.

# Related Documents

- [[Collaboration-Part04]]
- [[EventBus-Part01]]
