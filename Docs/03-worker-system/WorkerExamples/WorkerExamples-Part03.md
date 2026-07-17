---
title: WorkerExamples - Part 03
status: draft
version: 1.0
tags:
  - worker-system
  - examples
  - failure
related:
  - "[[WorkerExamples-Part01]]"
---

# WorkerExamples (Part 03)

## Document Index

Part 01 - Coding Workflow Examples
Part 02 - Review, Repair, and Verification Examples
Part 03 - Failure, Recovery, and Anti-Examples

# Bad Example: Direct Uncontrolled File Writes

```text
Five Workers edit the same project files directly.
No locks.
No artifacts.
No merge manager.
Result: conflicts and broken project.
```

# Good Recovery

```text
Worker crashes.
Runtime preserves logs.
WorkerTermination creates handoff.
Orchestrator spawns replacement Worker.
Replacement receives scoped context package.
```

# Bad Example: Context Flood

```text
Every Worker receives every terminal transcript.
Cheap model gets confused.
Worker edits wrong files.
```

# Better Pattern

```text
Workers receive task-specific artifacts and summaries.
```

# Final AI Notes

Use these examples when prompting lower-cost coding models. They show what Eulinx should and should not do.

# Related Documents

- [[WorkerExamples-Part01]]
- [[WorkerTermination-Part01]]
- [[ContextSharing-Part01]]

