---
title: MarkdownArtifacts Specification - Part 02
status: draft
version: 1.0
tags:
  - artifacts
  - markdown-artifacts
  - merge
related:
  - "[[MarkdownArtifacts-Part01]]"
  - "[[MergeFlow-Part04]]"
---

# MarkdownArtifacts Specification (Part 02)

## Document Index

Part 01 - What a markdown Artifact IS and its structure
Part 02 - Review rules and merge semantics

# Documentation As Artifacts

A key product principle is that documentation is a first-class Artifact, not a side effect. When a Worker generates a README, a changelog, or a plan, it emits a markdown Artifact so the doc is reviewable, versioned, and mergeable like code. This prevents "the agent said it updated the docs" from being unverifiable.

# Linking And References

Markdown Artifacts MAY reference other Artifacts (for example a plan references the code Artifact it describes). These references are recorded as `references` relationships (ArtifactRelationships Part 01) so the doc participates in the work graph and Replay can show the doc alongside the code it documents.

Relative links inside markdown SHOULD use workspace-relative paths that survive merge. Links to external URLs are allowed but MUST be flagged if they contain secrets (they should not).

# Merge Conflicts On Docs

Two markdown Artifacts editing the same doc can conflict:

- if both add new sections at the end, the MergeManager MAY append both (low risk)
- if both edit the same heading region, it is a conflict requiring human or worker_repair resolution ([[MergeFlow-Part04]])
- a `delete` of a doc another Artifact references is a dependency conflict

Because markdown is text, three-way merge is feasible, but the MergeManager MUST still fail-closed on ambiguous regions rather than guess.

# Versioning Docs

Documentation versions like code: a regenerated changelog is a new version with `parentArtifactId` set. The user can see the doc's history and which generation produced which wording.

# Invariants

```text
Docs are emitted as markdown Artifacts, not hidden side effects.
Doc-internal references are recorded as relationships.
Same-region doc edits are conflicts, not silent merges.
Doc versions chain like code versions.
```

# AI Notes

Do not let a Worker "update the README" by editing the file directly. Emit a markdown Artifact so the change is reviewable.

Do not silently three-way-merge ambiguous doc regions. Fail-closed and escalate.

Do not drop doc-to-code references. They are how a human audits that the documentation matches the implementation.

# Related Documents

- [[MarkdownArtifacts-Part01]]
- [[MergeFlow-Part04]]
- [[ArtifactRelationships-Part01]]
- [[ArtifactVersioning-Part01]]
- [[CodeArtifacts-Part01]]
