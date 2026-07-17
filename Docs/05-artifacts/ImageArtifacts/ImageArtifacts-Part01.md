---
title: ImageArtifacts Specification - Part 01
status: draft
version: 1.0
tags:
  - artifacts
  - image-artifacts
  - binary
related:
  - "[[05-artifacts/README]]"
  - "[[ArtifactArchitecture-Part03]]"
  - "[[ImageArtifacts-Diagrams]]"
---

# ImageArtifacts Specification (Part 01)

## Document Index

Part 01 - What an image Artifact IS and the storage model
Part 02 - Thumbnails, embedding, and binary constraints

# Purpose

ImageArtifacts defines the `image` kind: binary image outputs (screenshots, generated diagrams, icons, media from MCP tools). It is the representative of binary Artifacts in an otherwise text-first system.

# What An Image Artifact IS

An image Artifact carries binary image bytes. Its `contentType` is an image MIME (`image/png`, `image/jpeg`, `image/svg+xml`, etc.). It is produced by:

- a Worker capturing a screenshot of a terminal or UI
- an MCP media-generation tool (for example an image-gen capability)
- a diagram renderer producing a visual
- a user uploading an asset

# Storage Model

Because images are binary, they MUST be stored as blobs addressed by `contentRef`, never inline in SQLite (ArtifactArchitecture Part 03). The Artifact envelope still carries `contentHash`, `sizeBytes`, and `contentType`. For `image/svg+xml` (text), inline storage is permissible, but it is still treated as an image kind.

The `contentHash` is computed over the raw bytes so corruption detection works identically to text Artifacts.

# Immutability And Identity

An image Artifact is immutable like any other. A revised image is a new version with `parentArtifactId`. Two byte-identical images dedupe to one stored blob via `contentHash`.

# Embedding In Patches And Docs

An image is rarely merged by patching file bytes inline. Instead:

- a patch Artifact `add`/`modify` of an image file references the image Artifact by `artifact-ref`; the MergeManager copies the referenced bytes to `targetPath`
- a markdown Artifact embeds the image via a workspace-relative link to where it will be merged

This keeps patches and docs text while the binary lives in its own Artifact.

# Invariants

```text
Images are stored as blobs, never inline in SQLite.
contentHash covers raw bytes for corruption checks.
Revised images are new versions, not mutations.
Patches reference images; they do not inline them.
```

# AI Notes

Do not inline image bytes into a patch or a JSON Artifact. Reference the image Artifact; keep binary separate.

Do not skip the hash on images. Corruption in a screenshot or generated asset is just as bad as corruption in code.

Do not treat SVG as "not binary, so casual". It is still an image kind with its own validation (well-formed XML).

# Related Documents

- [[05-artifacts/README]]
- [[ImageArtifacts-Part02]]
- [[ImageArtifacts-Diagrams]]
- [[ArtifactArchitecture-Part03]]
- [[PatchArtifacts-Part02]]
