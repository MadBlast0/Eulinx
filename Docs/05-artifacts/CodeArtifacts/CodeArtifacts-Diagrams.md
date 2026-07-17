---
title: CodeArtifacts Diagrams
status: draft
version: 1.0
tags: [artifacts, diagrams]
related: ["[[CodeArtifacts-Part01]]"]
---

# CodeArtifacts Diagrams

```mermaid
flowchart TD
  B["Builder"] -->|"source text + contentType"| CA["Code Artifact"]
  CA --> S1["single file: targetPath + language"]
  CA --> S2["multi-file bundle: application/x-code-bundle"]
  CA --> S3["fragment: targetPath + anchor + position"]
  CA --> V["Verification lint / typecheck / build / test"]
  V -->|"verified bytes / sandbox"| P["derived Patch Artifact"]
  P --> MM["MergeManager"]
  MM -->|"atomic apply"| PROJ["Project State"]
  CA -.->|"single-file, non-destructive add only"| MM
```

```text
Builder --source--> Code Artifact
  shape: single | bundle | fragment
  language via contentType (no per-language core logic)
        |
        v
  Verification (lint/typecheck/build/test) against bytes or sandbox
        |
        v
  derived Patch Artifact --MergeManager--> Project (atomic)
  code IS-USUALLY merged via patch, not directly
  direct merge only: single-file, non-destructive, allowing profile
```

# Related Documents

- [[CodeArtifacts-Part01]]
- [[ArtifactArchitecture-Part01]]
- [[Verification-Part01]]
- [[MergeFlow-Part01]]
- [[ArtifactManager-Part01]]
