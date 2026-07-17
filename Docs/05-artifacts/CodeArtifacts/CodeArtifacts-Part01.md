---
title: CodeArtifacts Specification - Part 01
status: draft
version: 1.0
tags:
  - artifacts
  - code-artifacts
  - source-code
related:
  - "[[05-artifacts/README]]"
  - "[[ArtifactArchitecture-Part04]]"
  - "[[Verification-Part03]]"
---

# CodeArtifacts Specification (Part 01)

## Document Index

Part 01 - What a code Artifact IS and its structure
Part 02 - Review rules and language-agnostic handling
Part 03 - Verification obligations and merge semantics

# Purpose

CodeArtifacts defines the `code` kind: an Artifact whose content is source code, possibly spanning multiple files. It is the natural output of a coding Builder and the input to build/test Verifiers.

# What A Code Artifact IS

A code Artifact carries source text. Its `contentType` identifies the language (for example `text/typescript`, `text/python`, `text/rust`). It MAY be:

- a single file's content (most common for reviews)
- a multi-file bundle, where the content is a manifest mapping paths to file contents
- a fragment (a snippet to be placed into a larger file), in which case it declares the target path and insertion point

A code Artifact is reviewable source. It is NOT yet applied to the project; if it is meant to change files, it is usually accompanied by (or converted to) a `patch` Artifact for merging.

# Structure

For a single file:

- `contentType` = language MIME
- the bytes are the file content
- metadata SHOULD carry `targetPath` (where it would live) and `language`

For a multi-file bundle:

- `contentType` = `application/x-code-bundle`
- the content is a manifest: a list of `{ path, language, content }`
- metadata carries the bundle's root intent (for example "add auth module")

For a fragment:

- metadata carries `targetPath`, `anchor` (a marker or line), and `position` (`before`/`after`/`replace`)

# Language-Agnostic Handling

Eulinx MUST NOT require per-language logic in the core. Language is data (`contentType`), not control flow. Special handling (formatting, lint config) is delegated to the Verifier's tooling, which already knows the language from `contentType`. This keeps the cheap coding model's surface small: the Artifact just carries text and a language tag.

# Invariants

```text
A code Artifact carries source text, not applied files.
Multi-file code is a manifest of path->content, not loose files.
Language is expressed via contentType, not special fields.
A code Artifact is usually merged via a derived patch Artifact.
```

# AI Notes

Do not embed "apply this to file X" commands inside a code Artifact. If it changes files, express that as a patch Artifact derived from the code.

Do not let the core branch on language names. Put language in `contentType` and let the Verifier's tools handle specifics.

Do not ship a code Artifact without a `targetPath` when it is meant to become a file; the merge step needs to know where it goes.

# Related Documents

- [[05-artifacts/README]]
- [[CodeArtifacts-Part02]]
- [[ArtifactArchitecture-Part04]]
- [[PatchArtifacts-Part01]]
- [[Verification-Part03]]
