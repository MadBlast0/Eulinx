---
title: TestArtifacts Specification - Part 02
status: draft
version: 1.0
tags:
  - artifacts
  - test-artifacts
  - coverage
related:
  - "[[TestArtifacts-Part01]]"
  - "[[ArtifactVersioning-Part02]]"
---

# TestArtifacts Specification (Part 02)

## Document Index

Part 01 - What a test Artifact IS and its shape
Part 02 - How it feeds the Verifier and coverage recording

# Coverage Recording

A test Artifact MAY include a `coverage` block recording line/branch coverage produced by the run:

- `linesCovered` / `linesTotal`
- `branchesCovered` / `branchesTotal`
- `files`: per-file coverage detail

Coverage is advisory for the Verdict (it does not flip pass/fail) but is valuable for the refine loop and the user. A drop in coverage between versions is surfaced as an informational finding, not a hard block, unless the workflow configures a coverage gate.

# Feeding The Refine Loop

The refine loop (ArtifactVersioning Part 02) uses test Artifacts across versions:

- version N's test_report shows 3 failures
- the critic reviews the failures
- version N+1's test_report (after refine) is compared
- the Judge sees failures reduced and may stop, or continues if budget remains

Because each version's test Artifact is immutable and stored, this comparison is exact and replayable.

# Flaky Tests And Re-Runs

Test results can be flaky. The Verifier MAY re-run a failing test a bounded number of times before emitting a `fail` Verdict, recording `rerunCount` in the test Artifact. A test that passes only after reruns is still `pass` but flagged `flaky: true` so the user knows the green is weak. The MergeManager MAY require a clean (no-rerun) pass for hard gates on critical paths; this is a workflow policy, not a core rule.

# Archival And Use

Test Artifacts are archived with their candidate version (ArtifactLifecycle Part 06). They feed:

- the UI's test panel (per-version pass/fail)
- Replay (exact failure reproduction)
- metrics (success rate per Worker/workflow, [[11-features/Metrics/Metrics-Part01]])

# Invariants

```text
Coverage is advisory; it does not flip the Verdict.
Each version keeps its own immutable test_report.
Flaky passes are flagged, not hidden.
Test Artifacts archive with their candidate version.
```

# AI Notes

Do not let a coverage drop silently pass. Surface it as an informational finding so the user sees regression.

Do not hide flaky-test reruns. Mark `flaky: true`; a green that needed three reruns is not the same as a clean green.

Do not discard test Artifacts after merge. They are the evidence the change was verified and are needed for Replay.

# Related Documents

- [[TestArtifacts-Part01]]
- [[ArtifactVersioning-Part02]]
- [[ArtifactLifecycle-Part06]]
- [[11-features/Metrics/Metrics-Part01]]
- [[04-memory/Replay/Replay-Part01]]
