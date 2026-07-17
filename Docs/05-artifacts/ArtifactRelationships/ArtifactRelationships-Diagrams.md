---
title: ArtifactRelationships Diagrams
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-relationships
  - diagrams
related:
  - "[[ArtifactRelationships-Part01]]"
  - "[[ArtifactRelationships-Part03]]"
---

# ArtifactRelationships Diagrams

## Relationship Types

```mermaid
flowchart LR
  P["plan"] -->|"derived-from"| T["task_list"]
  T -->|"derived-from"| C["code"]
  C -->|"derived-from"| PA["patch v1"]
  PA -->|"parent-child"| PB["patch v2"]
  PB -->|"references"| R["review"]
  PB -->|"supersedes (later)"| FIX["fix patch"]
```

## Context Injection Via Relationships

```text
Worker continuing a task
        |
        v
resolve task's latest descendant Artifacts (relationship walk)
        |
        v
filter by sensitivity clearance
        |
        v
inject minimal relevant set (not full transcript)
```

## Cycle Rejection

```mermaid
flowchart TD
  A["Artifact A"] -->|"derived-from"| B["Artifact B"]
  B -->|"derived-from"| C["Artifact C"]
  C -->|"derived-from ?"| A
  A -.->|"REJECTED: cycle"| X["ArtifactManager refuses edge"]
```

## AI Notes

Do not draw relationships as free text inside Artifacts. They are explicit, queryable edges.

# Related Documents

- [[ArtifactRelationships-Part01]]
- [[ArtifactRelationships-Part02]]
- [[ArtifactRelationships-Part03]]
