---
title: PatchArtifacts Diagrams
status: draft
version: 1.0
tags:
  - artifacts
  - patch-artifacts
  - diagrams
related:
  - "[[PatchArtifacts-Part01]]"
  - "[[PatchArtifacts-Part04]]"
---

# PatchArtifacts Diagrams

## Patch Structure

```mermaid
flowchart TD
  P["patch Artifact"] --> B["base revision"]
  P --> OPS["operations[]"]
  OPS --> ADD["add: path + content"]
  OPS --> MOD["modify: path + hunks[]"]
  OPS --> DEL["delete: path + baseHash"]
  OPS --> REN["rename: oldPath -> path"]
  MOD --> H["hunk: fileHash, oldStart, newLines, context"]
```

## Application And Rollback

```text
MergeManager
   |
   +-- acquire lock on paths
   |
   +-- for each hunk: drift-check base hash
   |        |
   |        +-- match -> apply
   |        +-- mismatch -> conflict
   |
   +-- all applied? -> record reverse patch -> status = merged
   |
   +-- any unresolvable conflict? -> roll back all -> fail-closed
```

## Conflict Surface For Locking

```mermaid
flowchart LR
  PA["patch A: file x, y"] --> LM["LockManager"]
  PB["patch B: file y, z"] --> LM
  LM -->|"overlap on y"| C["predicted conflict on y"]
```

## AI Notes

Do not draw a patch as "a command". Draw it as operations + hunks anchored to base hashes.

# Related Documents

- [[PatchArtifacts-Part01]]
- [[PatchArtifacts-Part02]]
- [[PatchArtifacts-Part03]]
- [[PatchArtifacts-Part04]]
