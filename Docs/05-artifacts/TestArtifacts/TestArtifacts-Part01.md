---
title: TestArtifacts Specification - Part 01
status: draft
version: 1.0
tags:
  - artifacts
  - test-artifacts
  - test-results
related:
  - "[[05-artifacts/README]]"
  - "[[Verification-Part03]]"
---

# TestArtifacts Specification (Part 01)

## Document Index

Part 01 - What a test Artifact IS and its shape
Part 02 - How it feeds the Verifier and coverage recording

# Purpose

TestArtifacts defines the `test_report` kind: the structured result of running tests against an Artifact or a sandbox tree. It is the data the `test` Verifier consumes to produce a deterministic Verdict.

# What A Test Artifact IS

A test Artifact carries the outcome of a test run. It is produced by a test runner (invoked by a Verifier or a Worker under verification) and is itself an Artifact so it is replayable and auditable. Its `contentType` is `application/json` (structured) or `text/x-test-log` (raw), with structured preferred.

A test Artifact SHOULD contain:

- `summary`: total, passed, failed, skipped, errored counts
- `suite`: the suite or framework name
- `durationMs`: run time
- `tests`: a list of per-test records, each with `name`, `status` (pass/fail/skip/error), `durationMs`, and optional `message`/`stack` on failure
- `exitCode`: the runner's exit code (0 = all passed)
- `targetArtifactRef`: the Artifact or sandbox the tests ran against
- `environment`: optional note (OS, runner version)

# How It Differs From A Log

A `log` Artifact is raw output. A `test_report` is structured and machine-readable. The Verifier prefers a test_report because it can map `exitCode` and per-test `status` to a deterministic `pass`/`fail` Verdict without parsing free text. A raw log requires fragile text parsing and is advisory at best.

# Relation To Verification

The `test` Verifier (Verification Part 03) runs the test suite in a sandbox built from the candidate Artifact (or its derived patch), captures the result as a test Artifact, and turns it into a Verdict:

- `exitCode == 0` and zero failures -> `outcome: pass`, `authoritative: true`
- any failure or non-zero exit -> `outcome: fail`, `authoritative: true`

Because the test Artifact is stored, Replay can show exactly which tests failed for which candidate version.

# Invariants

```text
A test_report is structured and machine-readable, not free text.
exitCode and per-test status drive the deterministic Verdict.
The test_report is itself an Artifact, stored for replay.
Tests run against the candidate Artifact/sandbox, not live project.
```

# AI Notes

Do not represent test results as a loose `log` when a structured `test_report` is possible. The Verifier needs structure to be authoritative.

Do not let a test Artifact claim pass when `exitCode != 0`. The Verdict is derived from the data, not from a Worker's opinion.

Do not run tests against the live project to verify a candidate. Build the sandbox from the Artifact so the verdict means "this change passes", not "the repo already passed".

# Related Documents

- [[05-artifacts/README]]
- [[TestArtifacts-Part02]]
- [[Verification-Part03]]
- [[06-workflow-engine/VerifierNodes/VerifierNodes-Part03]]
- [[ArtifactLifecycle-Part03]]
