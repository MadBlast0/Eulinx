---
title: WorkerExamples - Part 04
status: draft
version: 1.0
tags:
  - worker-system
  - examples
  - end-to-end
related:
  - "[[WorkerExamples-Part01]]"
---

# WorkerExamples (Part 04)

## Document Index

Part 01 - Coding Workflow Examples
Part 02 - Review, Repair, and Verification Examples
Part 03 - Failure, Recovery, and Anti-Examples
Part 04 - Full End-to-End Worker Records

# Example Worker Record

```yaml
worker_id: worker_auth_backend_01
workspace_id: workspace_saas_app
task: Implement backend login route
profile: standard
sandbox: git_worktree
permissions:
  filesystem.read: src/server/**
  filesystem.write: patch_artifact_only
  terminal.input: owned_terminal
outputs:
  - patch_artifact_auth_backend_v1
  - test_report_auth_backend_v1
termination:
  reason: natural_completion
  handoff: backend_auth_handoff_v1
```

# Example Post-Mortem

```yaml
status: failed
reason: tests_failed_after_retry_limit
useful_artifacts:
  - failing_test_report
  - partial_patch
next_step:
  spawn repair worker with failing test report
```

# Final AI Notes

Concrete examples should be copied into AI prompts when asking cheaper models to implement Worker logic.

# Related Documents

- [[WorkerExamples-Part01]]
- [[WorkerTermination-Part05]]

