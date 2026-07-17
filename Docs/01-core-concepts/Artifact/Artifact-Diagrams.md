---
title: Artifact Diagrams
status: draft
version: 1.0
tags:
  - core-concepts
  - diagrams
related:
  - "[[Artifact-Part01]]"
---

# Artifact Diagrams

```mermaid
classDiagram
  class Artifact {
    +id
    +workspaceId
    +projectId
    +taskId
    +workerId
    +orchestratorId
    +type
    +status
    +version
    +checksum
    +metadata
    +createdAt
    +updatedAt
  }
  class Workspace
  class Project
  class Session
  class Task
  class Worker
  class Orchestrator
  Artifact --> Workspace : belongs to
  Artifact --> Project : belongs to
  Artifact --> Session : traceable to
  Artifact --> Task : source
  Artifact --> Worker : source
  Artifact --> Orchestrator : source
  Artifact --> Artifact : parent / related
```

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> Stored
  Stored --> Verified
  Verified --> Approved
  Approved --> Consumed
  Consumed --> Archived
  Verified --> Rejected : failure
  Rejected --> Archived
```

```mermaid
flowchart TD
  W["Worker"] --> A["Artifact"]
  A --> V["Verification\nAI / Human / Tests / Scans"]
  V -->|pass| AP["Approved"]
  V -->|fail| RJ["Rejected\npreserved, notify Task"]
  AP --> MQ["Merge Queue"]
  MQ --> MM["Merge Manager"]
  MM --> WS["Workspace"]
  RJ -.->|MUST NOT| MQ
```

```text
Artifact model (ownership & traceability)
  Workspace -+
  Project   -+- belongs to / traceable to
  Session   -¦
  Task      -¦ source
  Worker    -¦ source
  Orchestrator + source
  version: immutable, new change = new version
  checksum: integrity / provenance

Lifecycle
  Created ? Stored ? Verified ? Approved ? Consumed ? Archived
                                  ?
                                Rejected (MUST NOT enter Merge Queue)

Merge pipeline
  Artifact ? Verification ? Approval ? Merge Queue ? Merge Manager ? Workspace
  Only approved artifacts may merge.
```
# Related Documents
- [[Artifact-Part01]]
- [[Artifact-Part02]]
- [[Artifact-Part03]]
- [[Artifact-Part04]]
