---
title: ImageArtifacts Specification - Part 02
status: draft
version: 1.0
tags:
  - artifacts
  - image-artifacts
  - thumbnails
related:
  - "[[ImageArtifacts-Part01]]"
  - "[[ArtifactLifecycle-Part06]]"
---

# ImageArtifacts Specification (Part 02)

## Document Index

Part 01 - What an image Artifact IS and the storage model
Part 02 - Thumbnails, embedding, and binary constraints

# Thumbnails

Large images SHOULD have a generated thumbnail stored alongside (or as a separate small image Artifact `derived-from` the original). Thumbnails serve:

- fast rendering in the UI gallery and the right-side context panel
- low-cost preview in chat channels and reviews
- reduced memory when listing many images

The thumbnail is a derived Artifact; the original remains the source of truth for merge.

# Embedding And Semantic Search

Images are NOT embedded into vector memory by default. Their metadata (title, tags, `description`) MAY be embedded for searchability, but the pixel content is not vectorized unless the workspace explicitly enables image embedding (for example for a vision RAG use case). Secret/sensitive images MUST NOT be embedded.

# Binary Constraints

Binary Artifacts carry constraints text Artifacts do not:

- they cannot be line-diffed; a "diff" is a similarity score plus optional visual overlay
- they cannot be linted or typechecked; verification is limited to format validity and (optionally) dimension/size policy
- they are heavier on storage, so retention and GC (ArtifactLifecycle Part 06) apply more aggressively
- they MUST respect sensitivity: a `secret` screenshot (for example containing a key) is access-controlled and wiped per retention

# Merge Semantics

An image is merged by copying the referenced bytes to `targetPath` under the MergeManager. Overwriting an existing image is a modification and is recorded for rollback. Deleting an image file follows the same destructive-approval rule as other deletes.

# Invariants

```text
Thumbnails are derived Artifacts; originals stay canonical.
Images are not vector-embedded by default.
Binary verification is format/size only, not lint/typecheck.
Secret images are access-controlled and wiped per retention.
```

# AI Notes

Do not try to "diff" images line by line. Use a similarity score; a visual overlay is a UI concern, not a merge primitive.

Do not embed image pixels into semantic search by default; embed metadata, and respect sensitivity.

Do not keep large images forever. Apply retention/GC; archived unreferenced images may drop rendered bytes but keep metadata + thumbnail.

# Related Documents

- [[ImageArtifacts-Part01]]
- [[ImageArtifacts-Diagrams]]
- [[ArtifactLifecycle-Part06]]
- [[04-memory/VectorMemory/VectorMemory-Part01]]
- [[ArtifactArchitecture-Part02]]
