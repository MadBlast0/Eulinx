---
title: ContextManager Diagrams
status: draft
version: 1.0
tags:
  - runtime
  - context-manager
  - context
  - diagrams
related:
  - "[[02-runtime/README]]"
  - "[[ContextManager-Part01]]"
  - "[[MemoryManager-Part01]]"
  - "[[PermissionManager-Part01]]"
  - "[[Prompt-Part01]]"
---

# ContextManager Diagrams

## Context Package Assembly

### High-Level Overview

```mermaid
graph LR
  REQ["Context Request"] --> CM["ContextManager"]
  CM --> SRC["MemoryManager, ArtifactManager, WorkspaceManager"]
  CM --> PM["PermissionManager"]
  CM --> PKG["Context Package"]
  PKG --> ACT["Worker, Tool, Workflow Node"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  REQ["Context Request"] --> EV1["context.requested"]
  EV1 --> SEL["Select candidate sources"]
  SEL --> S1["Task description"]
  SEL --> S2["Phase summary"]
  SEL --> S3["Parent orchestrator instructions"]
  SEL --> S4["Relevant Artifacts"]
  SEL --> S5["Selected file excerpts"]
  SEL --> S6["Memory summaries"]
  SEL --> S7["Tool instructions"]
  SEL --> S8["Permission limits"]
  SEL --> S9["Expected output format"]
  S1 --> AUTH["PermissionManager check per source"]
  S4 --> AUTH
  S5 --> AUTH
  S6 --> AUTH
  AUTH -->|"denied"| DROP["Exclude source, record redaction"]
  AUTH -->|"allowed"| RED["Redaction pipeline"]
  RED --> BUD["Token budget check"]
  BUD --> PKG["ContextPackage"]
  DROP --> BUD
  PKG --> EV2["context.created"]
  EV2 --> DEL["context.delivered"]
  EV1 -.-> EB["EventBus"]
  EV2 -.-> EB
  DEL -.-> EB
```

### ASCII

```text
ContextPackage
  id | workspaceId | projectId | actorId | taskId | purpose
  includedMemories | includedArtifacts | includedFiles
  includedInstructions | redactions | tokenEstimate | createdAt

Assembly order:
  1. select candidate sources
  2. ask PermissionManager about EVERY source
  3. run redaction pipeline
  4. estimate tokens and apply budget
  5. emit context.created, then context.delivered

Selection rule:
  Prefer structured Artifacts and summaries over raw transcript history.
  Need code   -> send the exact file or excerpt.
  Need intent -> send the Artifact summary.
  Do not send everything just in case.

Tables: context_packages, context_sources, context_redactions, context_usage
```

### Sequence

```mermaid
sequenceDiagram
  participant WSP as "WorkerSpawner"
  participant CM as "ContextManager"
  participant PM as "PermissionManager"
  participant MEM as "MemoryManager"
  participant AM as "ArtifactManager"
  participant WSM as "WorkspaceManager"
  participant EB as "EventBus"

  WSP->>CM: request context for Worker w_123, task t_9
  CM->>EB: context.requested
  CM->>MEM: fetch memory summaries for project
  CM->>AM: fetch relevant Artifacts
  CM->>WSM: fetch file excerpts for affected paths
  CM->>PM: may w_123 access each source?
  PM-->>CM: allow memory, deny secrets scope
  CM->>EB: context.redacted
  CM->>CM: estimate tokens, apply budget
  CM->>EB: context.created
  CM-->>WSP: ContextPackage
  CM->>EB: context.delivered
```

## Permissions, Redaction, and Budget

### High-Level Overview

```text
Candidate source -> authorized? -> redact -> fits budget? -> include
Anything unauthorized is excluded, never "probably safe".
```

### Detailed Mermaid

```mermaid
flowchart TD
  SRC["Candidate source"] --> ASK["PermissionManager.evaluate"]
  ASK -->|"deny"| REC["Record redaction: sourceId, redactionType, reason, policyId, createdAt"]
  ASK -->|"allow"| SCAN["Scan for redaction targets"]
  SCAN --> T1["secrets"]
  SCAN --> T2["tokens"]
  SCAN --> T3["private memory"]
  SCAN --> T4["other workspace data"]
  SCAN --> T5["unapproved files"]
  SCAN --> T6["credentials"]
  SCAN --> T7["personal user data"]
  SCAN --> T8["plugin private state"]
  T1 --> REC
  T3 --> REC
  T6 --> REC
  SCAN --> CLEAN["Clean source"]
  CLEAN --> FIT{"Within token budget?"}
  FIT -->|"Yes"| INC["Include in package"]
  FIT -->|"No"| COMP["Apply compression strategy"]
  COMP --> PRI["Priority order drop"]
  PRI --> INC
  REC -.-> EB["EventBus context.redacted"]
```

### ASCII

```text
Budget inputs:
  modelContextWindow | reservedOutputTokens | taskPriority
  workspaceBudget | sessionBudget | workerBudget

Compression strategies:
  extractive_summary | abstractive_summary | artifact_digest
  file_excerpt | symbol_excerpt | recent_events_only | dependency_context

Priority order when context must be reduced:
  1. Keep task instruction
  2. Keep permission limits
  3. Keep required artifacts
  4. Keep directly affected file excerpts
  5. Keep recent relevant events
  6. Drop unrelated transcript

Redaction record: sourceId, redactionType, reason, policyId, createdAt
```

### Sequence

```mermaid
sequenceDiagram
  participant CM as "ContextManager"
  participant PM as "PermissionManager"
  participant EST as "Token Estimator"
  participant EB as "EventBus"

  CM->>PM: may actor read memory scope m_private?
  PM-->>CM: deny, project policy
  CM->>EB: context.redacted (private memory)
  CM->>EST: estimate tokens for remaining sources
  EST-->>CM: 42000 over budget of 30000
  CM->>CM: artifact_digest and file_excerpt compression
  CM->>EST: re-estimate
  EST-->>CM: 27500 within budget
  CM->>EB: context.created
```

## Injection Targets

### High-Level Overview

```mermaid
graph TD
  CM["ContextManager"] --> W["Worker packet"]
  CM --> O["Orchestrator packet"]
  CM --> T["Tool packet"]
  CM --> N["Workflow Node packet"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  CM["ContextManager"] --> SHAPE{"Actor type"}
  SHAPE -->|"Worker"| W["task, role for this task, allowed tools, permission limits, relevant artifacts, file excerpts, expected output format"]
  SHAPE -->|"Orchestrator"| O["plan status, child summaries, phase progress, blockers, artifact summaries"]
  SHAPE -->|"Tool"| T["structured parameters only"]
  SHAPE -->|"Workflow Node"| N["node input data, upstream artifacts, relevant runtime state"]
  T --> AITOOL{"Is the tool itself an AI tool?"}
  AITOOL -->|"No"| NOLANG["No large natural-language context"]
  AITOOL -->|"Yes"| LANG["Natural-language context permitted"]
  W --> DEL["context.delivered"]
  O --> DEL
  N --> DEL
  DEL -.-> EB["EventBus"]
```

### ASCII

```text
Worker         -> task, role, allowed tools, permission limits,
                  relevant artifacts, file excerpts, expected output format
Orchestrator   -> plan status, child summaries, phase progress,
                  blockers, artifact summaries
Tool           -> structured parameters only
Workflow Node  -> node input data, upstream artifacts, runtime state

Different actors need different context shapes.
Do not build a single giant context string for everything.
```

### Sequence

```mermaid
sequenceDiagram
  participant ORC as "Orchestrator"
  participant CM as "ContextManager"
  participant W as "Worker"
  participant TR as "ToolRegistry"

  ORC->>CM: request orchestrator packet
  CM-->>ORC: plan status, child summaries, blockers
  ORC->>CM: request worker packet for task t_9
  CM-->>W: task, role, allowed tools, permission limits, excerpts
  W->>TR: invoke tool with structured parameters
  TR->>CM: request tool packet
  CM-->>TR: structured parameters only
```

## Related Documents

- [[ContextManager-Part01]]
- [[ContextManager-Part02]]
- [[ContextManager-Part03]]
- [[ContextManager-Part04]]
- [[ContextManager-Part05]]
- [[ContextManager-Part06]]
- [[MemoryManager-Part01]]
- [[ArtifactManager-Part01]]
- [[PermissionManager-Part01]]
- [[ToolRegistry-Part01]]
- [[EventBus-Part01]]
- [[02-runtime/README]]
