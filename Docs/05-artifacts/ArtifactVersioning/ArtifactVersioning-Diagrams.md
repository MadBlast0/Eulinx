---
title: ArtifactVersioning Diagrams
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-versioning
  - diagrams
related:
  - "[[ArtifactVersioning-Part01]]"
  - "[[ArtifactVersioning-Part03]]"
---

# ArtifactVersioning Diagrams

## Version Chain

```mermaid
flowchart LR
  V1["patch v1 (version 1)"] -->|"parent-child"| V2["patch v2 (version 2)"]
  V2 -->|"parent-child"| V3["patch v3 (version 3)"]
  R1["review v1"] -->|"references"| V1
  R2["review v2"] -->|"references"| V2
```

## Refine Loop -> Versions -> Merge

```text
base draft -> version 1
critic reviews v1
refine worker -> version 2 (parent = v1)
judge diffs v1..v2, scores
   |
   +-- improve & under budget -> version 3 ...
   +-- no improvement / budget hit -> select best verified version -> MergeManager
```

## Reconstruction

```mermaid
flowchart TD
  ROOT["version 1"] --> D2["version 2"]
  D2 --> D3["version 3"]
  ROOT --> H1["hash + verdicts"]
  D2 --> H2["hash + verdicts"]
  D3 --> H3["hash + verdicts"]
  H1 --> REC["Replay reconstructs exact history"]
  H2 --> REC
  H3 --> REC
```

## AI Notes

Do not draw versions as mutations of one object. Draw them as a chain of distinct immutable Artifacts.

# Related Documents

- [[ArtifactVersioning-Part01]]
- [[ArtifactVersioning-Part02]]
- [[ArtifactVersioning-Part03]]
