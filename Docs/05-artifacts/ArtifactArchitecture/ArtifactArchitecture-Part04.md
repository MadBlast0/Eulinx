---
title: ArtifactArchitecture Specification - Part 04
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-architecture
  - artifact-kinds
related:
  - "[[ArtifactArchitecture-Part03]]"
  - "[[PatchArtifacts-Part01]]"
  - "[[CodeArtifacts-Part01]]"
---

# ArtifactArchitecture Specification (Part 04)

## Document Index

Part 01 - What an Artifact IS, the Artifact contract, and the propose/don't-mutate boundary
Part 02 - The metadata envelope (every field and its meaning)
Part 03 - Content addressing, immutability, and the content reference
Part 04 - Artifact kinds catalog and the type registry
Part 05 - Addressing, resolution, and how everything refers to an Artifact

# The Kind Registry

Every Artifact has a `kind` drawn from a registry. The registry is the single place that defines which kinds exist and which typed spec owns each one. Adding a kind is a registry change, not an ad-hoc decision by a Worker.

The baseline registry:

- `plan`: a textual plan or outline of intended work.
- `task_list`: a decomposed checklist of subtasks.
- `patch`: a diff/patch that can be applied to project files (see PatchArtifacts).
- `code`: a source-code Artifact, possibly multi-file (see CodeArtifacts).
- `markdown`: a documentation Artifact (see MarkdownArtifacts).
- `json`: a structured-data Artifact (see JSONArtifacts).
- `image`: a binary image Artifact (see ImageArtifacts).
- `test_report`: a test-result and coverage Artifact (see TestArtifacts).
- `log`: raw or semi-structured output logs from a Worker or process.
- `diagram`: a graph or visual representation, usually rendered.
- `prompt`: a prompt template or prompt instance.
- `model_response`: a raw or structured model output.
- `review`: a review or critique text, usually from a critic.
- `verification_result`: a Verifier's Verdict surfaced as an Artifact (read-only mirror).
- `merge_result`: a MergeManager result surfaced as an Artifact (read-only mirror).

# Registry Ownership

Each registered kind maps to exactly one typed spec in this section. The typed spec defines:

- the expected `contentType`
- the structural rules the bytes MUST satisfy
- any kind-specific metadata the envelope SHOULD carry
- the verification obligations particular to that kind
- the merge semantics particular to that kind

For example, `patch` is owned by PatchArtifacts and defines hunk format and application rules. `code` is owned by CodeArtifacts and defines review and language-agnostic handling. `json` is owned by JSONArtifacts and defines schema obligations.

# Kind And ContentType

`kind` and `contentType` are related but distinct. `kind` is the semantic role in Eulinx; `contentType` is the byte format. A `code` Artifact may have `contentType` `text/typescript` or `text/python`. A `json` Artifact is always `application/json`. The Verifier and MergeManager branch on `kind` first, then consult `contentType` for format-specific behavior.

# Extensibility

Plugins (see [[09-plugin-system/README]]) MAY register new kinds, but a plugin-registered kind MUST NOT shadow a baseline kind, and it MUST define its own typed rules. A Worker MUST NOT emit a `kind` that is not in the active registry; the ArtifactManager MUST reject unknown kinds at creation.

# Invariants

```text
kind is drawn from the registry and set at creation.
Each kind maps to exactly one typed spec.
Unknown kinds are rejected at creation.
kind is immutable for the life of the Artifact.
A plugin kind must not shadow a baseline kind.
```

# AI Notes

Do not let a Worker invent a `kind` on the fly. If the registry does not have it, the ArtifactManager rejects it. Register the kind first.

Do not overload `markdown` for things that are really `plan` or `review`. The kind drives verification and merge behavior; mislabeling an Artifact hides its real obligations.

Do not treat `verification_result` and `merge_result` as authorable. They are read-only mirrors of runtime events, emitted by the Verifier and MergeManager, never by a Worker.

# Related Documents

- [[ArtifactArchitecture-Part03]]
- [[ArtifactArchitecture-Part05]]
- [[PatchArtifacts-Part01]]
- [[CodeArtifacts-Part01]]
- [[MarkdownArtifacts-Part01]]
- [[JSONArtifacts-Part01]]
- [[ImageArtifacts-Part01]]
- [[TestArtifacts-Part01]]
- [[09-plugin-system/README]]
