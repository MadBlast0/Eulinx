---
title: ArtifactArchitecture Diagrams
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-architecture
  - diagrams
related:
  - "[[ArtifactArchitecture-Part01]]"
  - "[[ArtifactArchitecture-Part05]]"
---

# ArtifactArchitecture Diagrams

## Artifact Object And Its Envelope

```mermaid
flowchart LR
  A["Artifact"] --> ID["id (immutable)"]
  A --> KIND["kind (registry)"]
  A --> CR["contentRef -> store"]
  A --> HASH["contentHash"]
  A --> META["metadata envelope"]
  A --> LC["status (lifecycle)"]
  A --> VER["version chain"]
  A --> PROV["provenance: workerId, taskId, workflowId"]
```

## Content Addressing And Resolution

```mermaid
flowchart TD
  REF["artifact-ref: id + version? + contentHash?"] --> AM["ArtifactManager"]
  AM --> LOOKUP["lookup record by id"]
  LOOKUP --> READ["read contentRef"]
  READ --> LOAD["load bytes from store"]
  LOAD --> CHECK["verify contentHash"]
  CHECK -->|"match"| OK["return bytes + envelope"]
  CHECK -->|"mismatch"| REJ["reject: corruption"]
```

## Proposed vs Trusted Boundary

```text
  proposed side                          trusted side
  ---------------------------------      -------------------------------
  Builder/Worker emits Artifact
        |
        v
  ArtifactManager: store + validate
        |
        v
  Verification: Verdict
        |
        +-- fail (deterministic) -----> rejected, never merged
        |
        +-- pass ---------------------> MergeManager acquires lock
                                            |
                                            v
                                       workspace changes
```

## AI Notes

Do not draw the Artifact as a file. Draw it as a record wrapped around a content reference, because that is what it is.

# Related Documents

- [[ArtifactArchitecture-Part01]]
- [[ArtifactArchitecture-Part02]]
- [[ArtifactArchitecture-Part03]]
- [[ArtifactArchitecture-Part04]]
- [[ArtifactArchitecture-Part05]]
