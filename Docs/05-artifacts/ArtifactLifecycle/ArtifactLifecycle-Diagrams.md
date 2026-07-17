---
title: ArtifactLifecycle Diagrams
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-lifecycle
  - diagrams
related:
  - "[[ArtifactLifecycle-Part01]]"
  - "[[ArtifactLifecycle-Part06]]"
---

# ArtifactLifecycle Diagrams

## State Machine

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> created
  created --> validated
  created --> rejected
  validated --> verified
  validated --> rejected
  verified --> merged
  verified --> rejected
  verified --> archived : expired
  merged --> archived
  rejected --> archived
  archived --> [*]
```

## Lifecycle To Trusted State

```mermaid
flowchart TD
  B["Builder / Worker"] -->|"emits"| D["draft"]
  D --> C["created (immutable)"]
  C --> V["validated (structure)"]
  V --> VF["verified (Verdict)"]
  V --> RJ["rejected"]
  VF --> AP["approval gate?"]
  AP -->|"yes, pending"| WAIT["verified + eligible"]
  AP -->|"no / granted"| MM["MergeManager"]
  MM --> MG["merged (trusted state)"]
  VF --> RJ
  WAIT -->|"expired"| AR["archived"]
  MG --> AR
  RJ --> AR
```

## Merge Transition Detail

```text
verified
  |
  +-- approval required? -> wait for human -> granted?
  |                                 |
  |                                 v
  |                              acquire lock
  |                                 |
  +-- no approval      -> acquire lock
                                        |
                                        v
                                   conflict-free?
                                        |
                              +---------+---------+
                              |                   |
                           yes                  no
                            |                   |
                            v                   v
                        apply hunks      escalate / reject (fail-closed)
                            |
                            v
                        status = merged
```

## AI Notes

Do not draw `rejected` as reversible to `merged`. Once rejected, the only forward path is a new Artifact.

# Related Documents

- [[ArtifactLifecycle-Part01]]
- [[ArtifactLifecycle-Part02]]
- [[ArtifactLifecycle-Part03]]
- [[ArtifactLifecycle-Part04]]
- [[ArtifactLifecycle-Part05]]
- [[ArtifactLifecycle-Part06]]
