---
title: BuilderNodes Diagrams
status: draft
version: 1.0
tags:
  - workflow-engine
  - builder-nodes
  - diagrams
related:
  - "[[06-workflow-engine/README]]"
  - "[[BuilderNodes-Part01]]"
  - "[[BuilderNodes-Part04]]
---

# BuilderNodes Diagrams

## The Artifact Boundary

```mermaid
flowchart TD
  SPEC["spec input"] --> BIND["prompt binding"]
  BIND --> REQ["ExecutionRequest (read-only profile)"]
  REQ --> EXE["ExecutionEngine -> Worker"]
  EXE --> ART["Artifact emitted"]
  ART --> STORE["artifact store (content-addressed)"]
  STORE --> REF["artifactRef on output port"]
  REF --> V["Verifier"]
  V --> M["Merge (applies under permission)"]
  M --> PROJ["trusted project state"]
  B["Builder"] -.->|"MUST NOT"| PROJ
```

## Refine Loop Integration

```mermaid
flowchart TD
  LOOP["Loop refine"] --> B["Builder"]
  B --> V["Verifier"]
  V --> C{"passed?"}
  C -->|"no"| LOOP
  C -->|"yes"| MERGE["Merge"]
```

## ASCII: Read-Only Enforcement

```text
Builder writes ONLY to artifact store.
Project tree is a separate location.
No code path reaches project except via Merge.
Permission profile = read-only by default.
```

## Related Documents

- [[06-workflow-engine/README]]
- [[BuilderNodes-Part01]]
- [[BuilderNodes-Part04]]
- [[VerifierNodes-Part01]]
- [[MergeManager-Part01]]
- [[Artifact-Part01]]
