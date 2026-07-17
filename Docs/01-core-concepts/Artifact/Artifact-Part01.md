---
title: ArtifactSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - artifact
related:
  - "[[01-core-concepts/README]]"
  - "[[Worker-Part01]]"
  - "[[Runtime-Part01]]"
  - "[[Workflow-Part01]]"
---
# Artifact Specification (Part 01)

## Purpose

An Artifact is the primary unit of information exchanged between Workers, Orchestrators and the Runtime.

Artifacts are immutable records of work produced during execution.

Workers communicate through Artifacts rather than unrestricted conversation histories.

---

## Philosophy

Artifacts make execution:

- Deterministic
- Reviewable
- Traceable
- Reusable
- Verifiable

Every meaningful output SHOULD become an Artifact.

---

## Responsibilities

An Artifact MUST:

- Belong to one Workspace
- Belong to one Project
- Be created by one execution source
- Be versioned
- Be traceable
- Support verification

---

## Artifact Types

Examples:

- Code Patch
- Markdown Document
- JSON Data
- Test Report
- Build Output
- Design Proposal
- Execution Plan
- Research Summary
- Terminal Log
- Screenshot
- Metrics Report

---

## Core Properties

- id
- workspaceId
- projectId
- taskId
- workerId
- orchestratorId
- type
- status
- version
- checksum
- metadata
- createdAt
- updatedAt

---

## Lifecycle

Created
↓
Stored
↓
Verified
↓
Approved
↓
Consumed
↓
Archived

---

## AI Notes

Artifacts are the contract between execution stages.

Prefer structured Artifacts over conversational context whenever possible.

