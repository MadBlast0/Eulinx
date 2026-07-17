---
title: Execution Diagrams
status: draft
version: 1.0
tags:
  - core-concepts
  - diagrams
related:
  - "[[Execution-Part01]]"
---

# Execution Diagrams

```mermaid
flowchart TD
  UG["User Goal"] --> RT["Runtime"]
  RT --> PL["Planning"]
  PL --> OH["Orchestrator Hierarchy"]
  OH --> TH["Task Hierarchy"]
  TH --> WE["Worker Execution"]
  WE --> AR["Artifacts"]
  AR --> VE["Verification"]
  VE --> MG["Merge"]
  MG --> WU["Workspace Updated"]
```

```mermaid
stateDiagram-v2
  [*] --> Requested
  Requested --> Accepted
  Accepted --> Planned
  Planned --> Decomposed
  Decomposed --> Scheduled
  Scheduled --> Executing
  Executing --> Reviewing
  Reviewing --> Verified
  Verified --> Merged
  Merged --> Completed
  Executing --> Blocked
  Executing --> Waiting
  Executing --> Retrying
  Executing --> Failed
  Executing --> Cancelled
  Blocked --> Executing
  Waiting --> Executing
  Retrying --> Executing
```

```mermaid
flowchart TD
  W["Worker"] --> ART["Artifact"]
  ART --> VF["Verification\nTests / Lint / AI / Human / Policy"]
  VF --> MM["Merge Manager\nonly component allowed to apply"]
  MM --> WS["Workspace"]
  VF -->|conflict| CR["Retry / Replan / Manual / Regenerate"]
  CR -.-> MM
```

```text
Core execution model
  User Goal
    ? Runtime (decides HOW)
    ? Planning
    ? Orchestrator Hierarchy
    ? Task Hierarchy
    ? Worker Execution (AI decides HOW to solve)
    ? Artifacts
    ? Verification
    ? Merge
    ? Workspace Updated

Lifecycle states
  Requested ? Accepted ? Planned ? Decomposed ? Scheduled
    ? Executing ? Reviewing ? Verified ? Merged ? Completed
  Alternative: Blocked / Waiting / Retrying / Failed / Cancelled
  - MUST NOT skip verification
  - Only Runtime controls transitions
  - Replanning preserves completed verified work

Decomposition levels
  Goal ? Phases ? Tasks ? Subtasks ? Execution Units

Merge flow
  Worker ? Artifact ? Verification ? Merge Manager ? Workspace
  Merge Manager is the ONLY component allowed to apply verified changes.
```
# Related Documents
- [[Execution-Part01]]
- [[Execution-Part02]]
- [[Execution-Part03]]
- [[Execution-Part04]]
- [[Execution-Part05]]
- [[Execution-Part06]]
- [[Execution-Part07]]
- [[Execution-Part08]]
