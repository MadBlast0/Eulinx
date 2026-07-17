---
title: CodeArtifacts Specification - Part 02
status: draft
version: 1.0
tags:
  - artifacts
  - code-artifacts
  - review
related:
  - "[[CodeArtifacts-Part01]]"
  - "[[Verification-Part04]]"
---

# CodeArtifacts Specification (Part 02)

## Document Index

Part 01 - What a code Artifact IS and its structure
Part 02 - Review rules and language-agnostic handling
Part 03 - Verification obligations and merge semantics

# Review Rules

A code Artifact is the primary subject of code review. Review is expressed as a `review` Artifact that `references` the code Artifact and carries findings.

Review findings SHOULD include:

- `severity`: error, warning, info
- `filePath` and `line`/`column` when the finding is location-specific
- `message`: what is wrong or suggested
- `rule`: the check or heuristic that produced it (for example `lint:no-unused`, `security:hardcoded-secret`)
- `suggestedFix`: optional recommended change

A review Artifact is advisory unless it is produced by a deterministic tool (for example a linter). A human reviewer or an AI critic produces advisory findings; the Verifier distinguishes them by `class` ([[Verification-Part01]]).

# Language-Agnostic Review

Because language is in `contentType`, a reviewer Worker (or tool) selects its rules from the language tag. Eulinx MUST NOT hardcode review logic per language in the Artifact spec. The review Artifact format is identical regardless of language; only the `rule` strings differ.

# Security And Secret Scanning

Code Artifacts MUST be scanned for secrets (hardcoded keys, tokens) as part of verification. A detected secret:

- marks the Artifact `sensitive`/`secret` if not already
- records a finding with `severity: error` and `rule: security:hardcoded-secret`
- blocks merge until the secret is removed or the user explicitly overrides with full understanding (rare, logged)

This is a deterministic check and therefore authoritative.

# Invariants

```text
A review references the code Artifact; it does not modify it.
Findings carry severity, location, and rule.
Secret detection is a deterministic, authoritative block.
Review format is language-independent; only rule strings differ.
```

# AI Notes

Do not let an AI reviewer's "looks fine" override a linter's error finding. Deterministic wins ([[Verification-Part01]]).

Do not store secrets in a code Artifact and expect it to merge. Secret scanning blocks it.

Do not hardcode review rules per language in the spec. Use `contentType` and let tooling supply rules.

# Related Documents

- [[CodeArtifacts-Part01]]
- [[CodeArtifacts-Part03]]
- [[Verification-Part01]]
- [[Verification-Part04]]
- [[ArtifactArchitecture-Part02]]
