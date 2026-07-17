---
title: WorkerTesting Specification - Part 05
status: draft
version: 1.0
tags:
  - testing
  - worker-testing
  - chaos
related:
  - "[[WorkerTesting-Part04]]"
  - "[[RegressionTesting-Part01]]"
---

# WorkerTesting Specification (Part 05)

## Document Index

Part 01 - Purpose, Determinism, and the Replay Harness
Part 02 - Lifecycle and Hierarchy Testing
Part 03 - Artifact, Verification, and Merge Testing
Part 04 - Refinement Loop and Orchestrator Testing
Part 05 - Failure, Recovery, and Chaos Testing

# Failure Testing

Worker tests MUST include the unhappy paths because that is where multi-agent systems break.

- a Worker crashes mid-task: the runtime MUST mark the Task failed and release its locks,
- a model fake yields malformed output: the Worker MUST surface a parse error, not hang,
- a verification fails repeatedly: the loop MUST stop and report, not infinite-retry,
- a parent Orchestrator dies: children MUST be re-parented or terminated cleanly.

# Recovery Testing

- a destroyed Worker's sandbox and artifacts MUST remain queryable for history but not executable,
- a Blocked Worker MUST resume exactly once its resource is freed,
- a retry MUST use the same Replay segment, producing the same outcome as the first attempt.

# Chaos Testing

A chaos suite SHOULD randomly inject:

- lock contention,
- Worker termination,
- event loss on a non-critical channel,
- budget exhaustion.

The invariants to assert under chaos:

- no two Workers ever hold the same exclusive lock,
- the workspace never enters a partially-merged corrupted state,
- progress aggregation never reports > 100%,
- every emitted artifact is eventually verified or rejected, never orphaned.

# AI Notes

Do not call a real model in Worker tests; if you need new behaviour, record a new Replay fixture.

Do not assert on exact token counts across machines; assert on pass counts and final artifact identity.

# Related Documents

- [[RegressionTesting-Part01]]
- [[04-memory/Replay/Replay-Part01]]
