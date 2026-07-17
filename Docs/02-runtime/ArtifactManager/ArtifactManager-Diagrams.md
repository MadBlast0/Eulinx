---
title: ArtifactManager Diagrams
status: draft
version: 1.0
tags:
  - runtime
  - artifact-manager
  - diagrams
  - architecture
related:
  - "[[ArtifactManager-Part01]]"
  - "[[ArtifactManager-Part02]]"
  - "[[ArtifactManager-Part03]]"
  - "[[MergeManager-Part01]]"
---

# ArtifactManager Diagrams

Each flow below is rendered four ways: high-level overview, detailed Mermaid, ASCII, and sequence.

## Artifact Creation Flow

### High-Level Overview

```mermaid
graph LR
  W["Worker"] --> AM["ArtifactManager"]
  AM --> S["Artifact Store"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  W["Worker Tool or Orchestrator Output"] --> REQ["ArtifactCreateRequest"]
  REQ --> PM["PermissionManager artifact.create"]
  PM --> VAL["Validate"]
  VAL --> T1["Known Artifact Type"]
  VAL --> T2["Valid Content Type"]
  VAL --> T3["Max Size"]
  VAL --> T4["Schema Compliance"]
  VAL --> T5["Checksum"]
  VAL --> T6["Sensitivity Classification"]
  VAL --> T7["Source Identity"]
  T7 --> STORE["Store Content"]
  STORE --> META["Store Metadata"]
  META --> IDX["Index Artifact"]
  IDX --> EMIT["Emit artifact.created"]
  EMIT -.-> WF["Workflow Routing"]
  PM --> REJ["status rejected"]
  VAL --> REJ
```

### ASCII

```text
artifact create request
  |
  v
permission check (artifact.create) ---- denied ---> rejected
  |
  v
schema validation ---------------------- invalid --> rejected
  known type, content type, max size, schema,
  checksum, sensitivity, source identity
  |
  v
content storage
  sqlite://artifact_content/{id}      (small)
  file://workspace/.Eulinx/artifacts/{id} (large)
  blob://artifact-store/{id}
  |
  v
metadata storage (creator, worker, tool, task,
  workflow node, version, checksum, sensitivity,
  verification state, merge state)
  |
  v
event emission  -.->  EventBus: artifact.created
  |
  v
Workflow routing (downstream nodes get references, not raw content)
```

### Sequence

```mermaid
sequenceDiagram
  participant W as "Worker"
  participant AM as "ArtifactManager"
  participant PM as "PermissionManager"
  participant S as "Artifact Store"
  participant DB as "SQLite Metadata"
  participant EB as "EventBus"
  participant WF as "Workflow"

  W->>AM: ArtifactCreateRequest type title content source
  AM->>PM: check artifact.create
  PM-->>AM: allow or deny
  alt denied
    AM-->>W: rejected
  else allowed
    AM->>AM: validate schema size checksum sensitivity
    AM->>S: store content
    S-->>AM: contentRef
    AM->>DB: store Artifact metadata status created
    DB-->>AM: artifactId version 1
    AM-->>EB: artifact.created
    AM-.->WF: artifact reference for routing
    AM-->>W: artifactId
  end
```

## Artifact Versioning Flow

### High-Level Overview

```mermaid
graph LR
  V1["Auth Plan v1"] --> V2["Auth Plan v2"]
  V2 --> V3["Auth Plan v3"]
```

### Detailed Mermaid

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> created
  created --> validated
  validated --> verified
  validated --> rejected
  verified --> merged
  verified --> rejected
  created --> rejected
  merged --> archived
  rejected --> archived
  archived --> [*]
```

### ASCII

```text
artifacts are immutable by default
an update creates a NEW version, it never overwrites

  Artifact id=a1 version=1 parentArtifactId=none   status=verified
        |
        v  update request
  Artifact id=a2 version=2 parentArtifactId=a1     status=created
        |
        v  update request
  Artifact id=a3 version=3 parentArtifactId=a2     status=created

status ladder:
  draft -> created -> validated -> verified -> merged -> archived
                          |            |
                          v            v
                       rejected     rejected

patch artifacts SHOULD be stored immutably.
patch artifacts SHOULD be immutable after validation.
artifact history MUST NOT be deleted silently.
```

### Sequence

```mermaid
sequenceDiagram
  participant W as "Worker"
  participant AM as "ArtifactManager"
  participant DB as "SQLite Metadata"
  participant EB as "EventBus"

  W->>AM: create artifact revision parentArtifactId a1
  AM->>DB: load parent artifact a1
  DB-->>AM: version 1 checksum sensitivity
  AM->>AM: validate new content and compute checksum
  AM->>DB: insert new artifact a2 version 2 parent a1
  AM->>DB: retain a1 unchanged
  DB-->>AM: artifactId a2
  AM-->>EB: artifact.versioned
  AM-->>W: artifactId a2 version 2
```

## Artifact to Merge Handoff Flow

### High-Level Overview

```mermaid
graph LR
  AM["ArtifactManager"] --> VER["Verifier"]
  VER --> MRG["MergeManager"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  P["Patch Artifact status created"] --> VS["Schema Validation"]
  VS --> VD["status validated"]
  VD --> EX["ExecutionEngine Runs Verification"]
  EX --> VR["Verification Result Artifact"]
  VR --> OK["status verified"]
  VR --> BAD["status rejected"]
  OK -.-> EB["EventBus artifact.verified"]
  OK --> MC["MergeManager Creates MergeCandidate"]
  MC --> CS["MergeManager Verifies Checksum"]
  CS --> APP["MergeManager Applies Patch"]
  APP --> MRES["merge_result Artifact"]
  MRES --> MSTAT["status merged"]
  APP --> AMD["ArtifactManager Never Applies Patches Directly"]
```

### ASCII

```text
THE SINGLE MOST IMPORTANT RULE IN Eulinx:
AI output MUST NOT directly mutate trusted state.

Worker produces patch Artifact
  |
  v
ArtifactManager validates schema         -> status validated
  |
  v
ExecutionEngine runs verification gates
  |
  v
verification_result artifact stored      -> status verified
  |                                          (or rejected)
  v
EventBus: artifact.verified
  |
  v
MergeManager creates MergeCandidate
  |
  v
MergeManager verifies checksum before applying
  |
  v
MergeManager applies patch to trusted workspace
  |
  v
merge_result artifact stored             -> status merged

ArtifactManager MUST NOT apply patches to project files.
ArtifactManager MUST NOT bypass MergeManager.
```

### Sequence

```mermaid
sequenceDiagram
  participant W as "Worker"
  participant AM as "ArtifactManager"
  participant EX as "ExecutionEngine"
  participant MRG as "MergeManager"
  participant EB as "EventBus"

  W->>AM: create patch artifact
  AM->>AM: validate schema and store checksum
  AM-->>EB: artifact.created
  AM->>EX: request verification
  EX-->>AM: verification_result artifact
  alt verification failed
    AM->>AM: set status rejected
    AM-->>EB: artifact.rejected
  else verification passed
    AM->>AM: set status verified
    AM-->>EB: artifact.verified
    EB-.->MRG: artifact.verified
    MRG->>AM: read patch artifact and checksum
    AM-->>MRG: contentRef checksum baseRevision
    MRG->>MRG: apply patch see MergeManager-Diagrams
    MRG->>AM: create merge_result artifact
    AM->>AM: set patch status merged
    AM-->>EB: artifact.merged
  end
```

## Related Documents

- [[ArtifactManager-Part01]]
- [[ArtifactManager-Part02]]
- [[ArtifactManager-Part03]]
- [[ArtifactManager-Part04]]
- [[ArtifactManager-Part05]]
- [[MergeManager-Part01]]
- [[PermissionManager-Part01]]
- [[EventBus-Part01]]
