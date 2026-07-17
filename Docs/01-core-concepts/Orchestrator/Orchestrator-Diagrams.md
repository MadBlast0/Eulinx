---
title: Orchestrator Diagrams
status: draft
version: 1.0
tags:
  - core-concepts
  - diagrams
related:
  - "[[Orchestrator-Part01]]"
---

# Orchestrator Diagrams

```mermaid
flowchart TD
  U["User"] --> RO["Root Orchestrator"]
  RO --> PO["Phase Orchestrators"]
  PO --> TO["Task Orchestrators"]
  TO --> W["Workers"]
  W --> AR["Artifacts"]
  AR --> VE["Verification"]
  VE --> MG["Merge"]
```

```mermaid
classDiagram
  class Orchestrator {
    +id
    +workspaceId
    +projectId
    +parentId
    +childOrchestrators
    +workers
    +assignedScope
    +state
    +metrics
  }
  Orchestrator "1" --> "*" Orchestrator : spawns child
  Orchestrator "1" --> "*" Worker : assigns tasks
```

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> Planning
  Planning --> Delegating
  Delegating --> Monitoring
  Monitoring --> Aggregating
  Aggregating --> Reporting
  Reporting --> Completed
  Completed --> Archived
```

```mermaid
flowchart TD
  UG["User Goal"] --> RT["Runtime"]
  RT --> RO["Root Orchestrator"]
  RO --> PH["Phase Orchestrator"]
  PH --> TA["Task Orchestrator"]
  TA --> W["Workers"]
  W --> AR["Artifacts"]
  AR --> VE["Verification"]
  VE --> MG["Merge"]
```

```text
Hierarchy (acyclic)
  User ? Root Orchestrator ? Phase Orchestrators ? Task Orchestrators ? Workers

Responsibilities
  - receive objectives, create execution plans
  - spawn Workers / child Orchestrators
  - track progress, aggregate results, report upward
  - MUST own assigned scope, delegate (not implement), track child execution
  - MUST NOT modify project files directly, bypass runtime services, ignore failures

Lifecycle
  Created ? Planning ? Delegating ? Monitoring ? Aggregating ? Reporting
    ? Completed ? Archived

Failure handling
  capture details ? save logs ? retry eligibility ? retry/replace Worker ? escalate
```
# Related Documents
- [[Orchestrator-Part01]]
- [[Orchestrator-Part02]]
- [[Orchestrator-Part03]]
- [[Orchestrator-Part04]]
- [[Execution-Part01]]
- [[Worker-Part01]]
