---
title: Verification Specification - Part 02
status: draft
version: 1.0
tags:
  - artifacts
  - verification
  - deterministic
related:
  - "[[Verification-Part01]]"
  - "[[TestArtifacts-Part01]]"
---

# Verification Specification (Part 02)

## Document Index

Part 01 - Purpose, the verify-don't-mutate rule, and deterministic vs AI precedence
Part 02 - Deterministic verifiers (schema, lint, typecheck, build, test)
Part 03 - AI verifiers (critic, judge) and advisory scoring
Part 04 - Authorship exclusion, gates, and the pipeline boundary

# Deterministic Verifiers

Deterministic verifiers run a tool against the Artifact's bytes (or a sandbox built from a derived patch) and report a fact. There are five baseline kinds:

- `schema`: confirms structured content (for example JSON) matches a declared `schemaRef`. Authoritative hard gate.
- `lint`: checks style and obvious errors per language (`contentType`). Authoritative.
- `typecheck`: runs the language type checker in a sandbox. Authoritative.
- `build`: compiles/links the proposed change in a sandbox. Authoritative.
- `test`: runs the test suite and produces a `test_report` Artifact ([[TestArtifacts-Part01]]). Authoritative.

# Sandbox Execution

Deterministic verifiers run in a sandbox rooted at the candidate, not the live project. The Verifier resolves the Artifact via ArtifactManager, reconstructs the candidate tree (applying the patch to a throwaway copy of the base), and runs the tool there. This is critical: a `build` against the real repo verifies code that was already there, not the proposed change, and would pass every time ([[06-workflow-engine/VerifierNodes/VerifierNodes-Part01]]).

# Mapping To Verdict

The verifier maps tool output to a Verdict:

- exit code 0 and no errors -> `outcome: pass`, `authoritative: true`
- non-zero exit or errors -> `outcome: fail`, `authoritative: true`
- tool hung past `timeoutMs` -> `outcome: timeout` (treated as fail for hard gates)
- tool crashed / misconfigured -> `outcome: error` (treated as fail for hard gates)

`timeout` and `error` are NOT `pass`. A gate that treats them as pass is open. The Verifier emits exactly one Verdict on every path ([[06-workflow-engine/VerifierNodes/VerifierNodes-Part01]]).

# Findings

Deterministic verifiers populate `findings` with machine-readable detail:

- `severity`: error / warning / info
- `code`: the rule or diagnostic code
- `message`: the human-readable diagnostic
- `filePath`, `line`, `column`: location when available
- `excerpt`: the offending line when available

These findings are what the refine loop acts on: the critic reads them, the refine Worker addresses them, the Judge checks they decreased.

# Invariants

```text
Deterministic verifiers run in a sandbox of the candidate, not live project.
exit code / structured result maps to pass/fail/timeout/error.
timeout and error are not pass.
findings are machine-readable and feed the refine loop.
```

# AI Notes

Do not run a deterministic verifier against the real repo. You will verify the old code, not the candidate, and the gate is effectively disabled.

Do not map `timeout` to `pass` "because it didn't fail". A hung verifier holding a hard gate open forever is a stuck run; emit `timeout` and block.

Do not leave findings empty on failure. The refine loop needs the diagnostic to improve the next version.

# Related Documents

- [[Verification-Part01]]
- [[Verification-Part03]]
- [[TestArtifacts-Part01]]
- [[06-workflow-engine/VerifierNodes/VerifierNodes-Part03]]
- [[PatchArtifacts-Part03]]
