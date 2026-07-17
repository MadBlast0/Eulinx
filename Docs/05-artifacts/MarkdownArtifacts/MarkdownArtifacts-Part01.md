---
title: MarkdownArtifacts Specification - Part 01
status: draft
version: 1.0
tags:
  - artifacts
  - markdown-artifacts
  - documentation
related:
  - "[[05-artifacts/README]]"
  - "[[ArtifactArchitecture-Part04]]"
---

# MarkdownArtifacts Specification (Part 01)

## Document Index

Part 01 - What a markdown Artifact IS and its structure
Part 02 - Review rules and merge semantics

# Purpose

MarkdownArtifacts defines the `markdown` kind: human-readable documentation produced by Workers (plans, specs, READMEs, changelogs, summaries). It is the most common non-code output and is usually safe to merge with light verification.

# What A Markdown Artifact IS

A markdown Artifact carries markdown text. Its `contentType` is `text/markdown`. It MAY carry YAML frontmatter at the top (title, status, tags) which the Artifact envelope already mirrors in `title`/`tags`, so frontmatter is supplementary, not the source of truth.

Common uses:

- `plan` Artifacts are frequently markdown
- documentation generated from a codebase
- release notes and changelogs from a commit range
- summaries injected into channels for other Workers

# Structure And Frontmatter

A markdown Artifact SHOULD be well-formed markdown. When frontmatter is present:

- it MUST be a valid YAML block delimited by `---` lines
- keys SHOULD be a subset of the envelope (title, tags, status) for consistency
- the body follows the frontmatter

The ArtifactManager's validation for markdown checks: balanced code fences, valid frontmatter YAML when present, and UTF-8 encoding. It does NOT check prose quality; that is a review concern.

# Review Rules

Markdown review is lighter than code review:

- a deterministic check ensures valid markdown / valid frontmatter
- an AI critic MAY assess clarity, completeness, or accuracy, but its verdict is advisory
- a `review` Artifact `references` the markdown and lists findings (broken links, missing sections, contradictions)

Markdown reviews rarely block merge unless the doc is structurally invalid or the user configured a hard gate.

# Merge Semantics

Markdown is typically merged by writing the content to `targetPath` under the MergeManager. Because it is non-destructive (an add or an overwrite of a doc file), it is often auto-approvable when the Worker's permission profile allows it and no destructive flag is set. Overwriting an existing doc still goes through the MergeManager and is recorded.

# Invariants

```text
Markdown carries markdown text; frontmatter is supplementary to the envelope.
Validation checks structure, not prose quality.
Markdown merge writes to targetPath via MergeManager, never directly.
AI markdown review is advisory unless a hard gate is configured.
```

# AI Notes

Do not put the canonical title/tags only in frontmatter. The envelope is the source of truth; frontmatter should mirror it.

Do not treat an AI "this doc is unclear" as a block. It is advisory; only structural invalidity is deterministic.

Do not merge markdown by copying a file outside the MergeManager, even though it feels safe. Consistency of the boundary matters.

# Related Documents

- [[05-artifacts/README]]
- [[MarkdownArtifacts-Part02]]
- [[ArtifactArchitecture-Part04]]
- [[Verification-Part04]]
- [[MergeFlow-Part01]]
