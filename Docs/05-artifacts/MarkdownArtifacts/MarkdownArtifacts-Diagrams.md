---
title: MarkdownArtifacts Diagrams
status: draft
version: 1.0
tags: [artifacts, diagrams]
related: ["[[MarkdownArtifacts-Part01]]"]
---

# MarkdownArtifacts Diagrams

```mermaid
flowchart TD
  W["Worker"] --> MA["Markdown Artifact text/markdown"]
  MA --> FM["optional YAML frontmatter (mirrors envelope)"]
  FM --> VAL["ArtifactManager validation: fences / frontmatter / UTF-8"]
  VAL --> REV["review: deterministic + advisory AI critic"]
  REV --> MM["MergeManager: write targetPath"]
  MM --> APPR["auto-approvable if profile allows + non-destructive"]
  MA --> REF["references -> relationships in work graph"]
  MA --> VERS["new version chains via parentArtifactId"]
  MA -.->|"same-region edit vs another doc"| CONF["conflict -> worker_repair / human"]
```

```text
Worker --emit--> Markdown Artifact (text/markdown)
  frontmatter supplementary; envelope is source of truth
        |
        v
  validation: balanced fences, valid frontmatter YAML, UTF-8
  review: deterministic structure + advisory AI (clarity/accuracy)
        |
        v
  MergeManager writes targetPath (non-destructive => often auto-approvable)
  doc-internal references -> recorded as relationships
  versions chain like code (parentArtifactId)
  conflict: same heading edited by two -> escalate, fail-closed on ambiguity
```

# Related Documents

- [[MarkdownArtifacts-Part01]]
- [[ArtifactArchitecture-Part01]]
- [[Verification-Part01]]
- [[MergeFlow-Part01]]
- [[ArtifactManager-Part01]]
