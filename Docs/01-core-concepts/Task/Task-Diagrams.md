---
title: Task Diagrams
status: draft
version: 1.0
tags:
  - core-concepts
  - diagrams
related:
  - "[[Task-Part01]]"
---

# Task Diagrams

```mermaid
flowchart TD
  G["Goal"] --> P["Phase"]
  P --> T["Task"]
  T --> ST["Subtask"]
  ST --> EU["Execution Unit"]
```

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> Validated
  Validated --> Ready
  Ready --> Assigned
  Assigned --> Running
  Running --> Reviewing
  Reviewing --> Verified
  Verified --> Completed
  Running --> Waiting
  Running --> Blocked
  Running --> Retrying
  Running --> Failed
  Running --> Cancelled
```

```mermaid
flowchart TD
  ORG["Orchestrator assigns Task"] --> SCH["Scheduler"]
  SCH --> DEP{"Dependencies satisfied?"}
  DEP -->|No| BL["Blocked\nreevaluate when conditions change"]
  DEP -->|Yes| RUN["Running Worker"]
  RUN --> ART["Produce Artifacts"]
  ART --> VER["Verification"]
  VER -->|pass| COMP["Completed"]
  VER -->|fail| RETRY["Retry / return to execution state"]
```

```text
A Task is the smallest logical unit of planned work.
  Orchestrator assigns; Worker executes; Runtime schedules.
  Task describes WHAT; Worker decides HOW.

Hierarchy
  Goal ? Phase ? Task ? Subtask ? Execution Unit

Lifecycle
  Created ? Validated ? Ready ? Assigned ? Running ? Reviewing
    ? Verified ? Completed
  Alternative: Waiting / Blocked / Retrying / Failed / Cancelled

Object model
  id, workspaceId, projectId, parentTaskId, childTaskIds, orchestratorId,
  assignedWorkerId, priority, status, dependencies, successCriteria, artifactIds

Dependencies: other Tasks, Artifacts, external tools, human approvals.
  Runtime MUST prevent execution until mandatory dependencies satisfied.
Blocking conditions: incomplete dependency, denied permission, unavailable tool,
  pending approval, policy prevents execution.
Completion requires: work done, success criteria met, artifacts exist, verification passes, event recorded.
```
# Related Documents
- [[Task-Part01]]
- [[Task-Part02]]
- [[Task-Part03]]
- [[Task-Part04]]
- [[Task-Part05]]
- [[Orchestrator-Part01]]
- [[Worker-Part01]]
- [[Artifact-Part01]]
