---
title: MergeManager Diagrams
status: draft
version: 1.0
tags:
  - runtime
  - merge-manager
  - diagrams
  - architecture
related:
  - "[[MergeManager-Part01]]"
  - "[[MergeManager-Part03]]"
  - "[[MergeManager-Part05]]"
  - "[[ArtifactManager-Part01]]"
---

# MergeManager Diagrams

Each flow below is rendered four ways: high-level overview, detailed Mermaid, ASCII, and sequence.

## Patch Intake and Eligibility Flow

### High-Level Overview

```mermaid
graph LR
  P["Patch Artifact"] --> MM["MergeManager"]
  MM --> MC["MergeCandidate"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  W["Worker Sandbox"] --> P["Patch Artifact"]
  P --> AM["ArtifactManager Validates Schema"]
  AM --> MM["MergeManager Creates MergeCandidate"]
  MM --> E1["Belongs to Active Workspace"]
  E1 --> E2["Paths Inside Project Boundary"]
  E2 --> E3["Known Source Worker or Tool"]
  E3 --> E4["Has Base Revision"]
  E4 --> E5["Stored as Artifact"]
  E5 --> E6["Passes Schema Validation"]
  E6 --> E7["No Unresolved Critical Verification Failure"]
  E7 --> RISK["Assign riskLevel by patchFormat"]
  RISK --> READY["Ready for Verification"]
  E2 --> WSM["WorkspaceManager Boundary Check"]
  WSM --> REJ["Rejected"]
  E1 --> REJ
  E4 --> REJ
  E7 --> REJ
  REJ -.-> EB["EventBus merge.rejected"]
```

### ASCII

```text
Artifact created
  |
  v
ArtifactManager validates schema
  |
  v
MergeManager creates MergeCandidate
  id, artifactId, workspaceId, projectId, sourceWorkerId,
  taskId, affectedPaths, patchFormat, baseRevision,
  verificationStatus, riskLevel
  |
  v
eligibility checks (ALL must pass)
  [ ] belongs to the active workspace
  [ ] targets paths inside the project boundary (WorkspaceManager)
  [ ] has a known source Worker or Tool
  [ ] has a base revision
  [ ] is stored as an Artifact
  [ ] passes schema validation
  [ ] no unresolved critical verification failure
  |
  +-- any check fails --> rejected -.-> EventBus: merge.rejected
  |
  v
ready for verification

patch formats by rising risk:
  unified_diff -> structured_patch -> file_replacement
  -> generated_file -> delete_file -> rename_file
```

### Sequence

```mermaid
sequenceDiagram
  participant W as "Worker"
  participant AM as "ArtifactManager"
  participant MM as "MergeManager"
  participant WSM as "WorkspaceManager"
  participant EB as "EventBus"

  W->>AM: produce patch artifact
  AM->>AM: validate artifact schema
  AM-->>EB: artifact.created
  EB-.->MM: artifact.created patch
  MM->>AM: read artifact metadata
  AM-->>MM: affectedPaths patchFormat baseRevision
  MM->>MM: create MergeCandidate
  MM->>WSM: validate affectedPaths against project boundary
  WSM-->>MM: allowed or denied
  alt not eligible
    MM-->>EB: merge.rejected
  else eligible
    MM->>MM: assign riskLevel
    MM-->>EB: merge.candidate_ready
  end
```

## Verification and Approval Gate Flow

### High-Level Overview

```mermaid
graph LR
  MC["MergeCandidate"] --> V["Verification Gates"]
  V --> PM["PermissionManager"]
  PM --> OK["Approved or Denied"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  MC["MergeCandidate riskLevel"] --> LOW["low risk"]
  MC --> MED["medium risk"]
  MC --> HIGH["high risk"]
  MC --> CRIT["critical risk"]
  LOW --> G1["Schema plus Patch Apply Dry Run"]
  MED --> G2["Schema plus Tests or Typecheck"]
  HIGH --> G3["Tests plus Reviewer Worker plus Human Approval"]
  CRIT --> G4["Explicit User Approval Every Time"]
  G1 --> EX["ExecutionEngine Runs Gates"]
  G2 --> EX
  G3 --> EX
  G4 --> EX
  EX --> VR["Verification Result"]
  VR --> PASS["verificationStatus passed"]
  VR --> FAIL["verificationStatus failed"]
  PASS --> PM["PermissionManager Merge Permission"]
  PM --> UI["User Approval Ticket"]
  UI --> DEC["Decision"]
  PM --> DEC
  DEC --> APPR["Approved Proceed to Apply"]
  DEC --> DEN["Denied"]
  FAIL --> DEN
  DEN -.-> EB["EventBus merge.denied"]
```

### ASCII

```text
gate strength scales with risk:
  low risk:  schema + patch apply dry run
  medium:    schema + tests or typecheck
  high:      tests + reviewer Worker + human approval
  critical:  explicit user approval every time

available gates:
  schema validation, static check, test run, type check,
  lint check, reviewer Worker approval, human approval,
  policy approval, risk approval

MergeManager -> ExecutionEngine: run verification
ExecutionEngine -> MergeManager: verification result (specific, not "looks good")
  |
  +-- failed -----------------------------> denied
  |
  +-- passed
        |
        v
      MergeManager -> PermissionManager: request merge permission
        |
        +-- approval needed -> UI approval ticket -> approve or deny
        |
        v
      decision (fail closed: no decision means denied)
        |
        +-- approved --> proceed to Apply Flow
        +-- denied ----> merge.denied

If a reviewer Worker repairs the patch, it produces a NEW Artifact.
It does NOT edit trusted files.
```

### Sequence

```mermaid
sequenceDiagram
  participant MM as "MergeManager"
  participant EX as "ExecutionEngine"
  participant PM as "PermissionManager"
  participant UI as "User Approval"
  participant EB as "EventBus"

  MM->>EX: run verification gates for riskLevel
  EX-->>MM: verification result and verificationIds
  alt verification failed
    MM-->>EB: merge.denied verification_failed
  else verification passed
    MM->>PM: request merge permission
    alt approval needed
      PM->>UI: show approval ticket
      UI-->>PM: approve or deny
    end
    PM-->>MM: permissionDecisionId decision
    alt denied
      MM-->>EB: merge.denied
    else approved
      MM-->>EB: merge.approved
    end
  end
```

## Apply, Conflict, and Rollback Flow

### High-Level Overview

```mermaid
graph LR
  A["Approved Candidate"] --> L["Lock and Snapshot"]
  L --> AP["Apply Patch"]
  AP --> H["History or Rollback"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  APPR["Approved MergeCandidate"] --> LCK["LockManager Acquire Locks"]
  LCK --> SNAP["Create Pre Merge Snapshot"]
  SNAP --> BASE["Compare Base Revision to Current Workspace"]
  BASE --> CLEAN["Clean"]
  BASE --> CONF["Conflict Detected"]
  CONF --> CT["base_revision_mismatch same_line_conflict file_deleted file_renamed symbol_modified dependency_conflict generated_file_exists permission_conflict lock_conflict"]
  CT --> RES["Resolution Strategy"]
  RES --> RS["auto_rebase three_way_merge worker_repair reviewer_worker human_merge reject"]
  RS --> NEWA["Worker Repair Produces New Artifact"]
  NEWA --> APPR
  CLEAN --> DRY["Dry Run Patch"]
  DRY --> APPLY["Apply Patch to Trusted Workspace"]
  APPLY --> VWS["Verify Workspace State"]
  VWS --> HIST["Record Merge History"]
  VWS --> RB["Rollback From Snapshot"]
  HIST --> REL["LockManager Release Locks"]
  RB --> REL
  REL -.-> EB["EventBus merge.applied or merge.rolled_back"]
```

### ASCII

```text
apply ritual (never skip a step):

  1. acquire locks              (LockManager: file locks, symbol locks)
  2. create pre-merge snapshot  (rollback data: paths, old hashes, old content)
  3. dry-run patch
  4. apply patch                (only MergeManager touches trusted files)
  5. verify workspace state
  6. record history
  7. release locks
  8. emit event

conflict branch at step 3:
  compare base revision to current workspace
    |
    +-- clean ------> continue to apply
    |
    +-- conflict ---> resolve: auto_rebase | three_way_merge |
                      worker_repair | reviewer_worker |
                      human_merge | reject
                      (MUST NOT silently discard another Worker's changes)

failure branch at step 5:
  verify fails -> rollback from snapshot -> release locks
               -> EventBus: merge.rolled_back

merge history record (required for Replay):
  mergeId, candidateId, artifactId, workerId, taskId,
  affectedPaths, verificationIds, permissionDecisionId,
  lockIds, result, createdAt
```

### Sequence

```mermaid
sequenceDiagram
  participant MM as "MergeManager"
  participant LK as "LockManager"
  participant WSM as "WorkspaceManager"
  participant FS as "Trusted Workspace"
  participant AM as "ArtifactManager"
  participant EB as "EventBus"

  MM->>LK: acquire locks for affectedPaths
  LK-->>MM: lockIds
  MM->>FS: create pre merge snapshot
  FS-->>MM: snapshotRef and old content hashes
  MM->>MM: compare base revision to current workspace
  alt conflict detected
    MM-->>EB: merge.conflict
    MM->>LK: release locks
    MM-->>MM: route to resolution strategy
  else clean
    MM->>FS: dry run patch
    FS-->>MM: dry run ok
    MM->>WSM: validate paths inside workspace roots
    WSM-->>MM: allowed
    MM->>FS: apply patch
    MM->>FS: verify workspace state
    alt verify failed
      MM->>FS: rollback from snapshot
      MM-->>EB: merge.rolled_back
    else verify passed
      MM->>AM: create merge_result artifact
      MM->>MM: record merge history
      MM-->>EB: merge.applied
    end
    MM->>LK: release locks
  end
```

## Related Documents

- [[MergeManager-Part01]]
- [[MergeManager-Part02]]
- [[MergeManager-Part03]]
- [[MergeManager-Part04]]
- [[MergeManager-Part05]]
- [[ArtifactManager-Part01]]
- [[LockManager-Part01]]
- [[PermissionManager-Part01]]
- [[WorkspaceManager-Part01]]
