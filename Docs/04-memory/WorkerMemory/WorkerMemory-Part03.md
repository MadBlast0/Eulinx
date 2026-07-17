---
title: WorkerMemory - Part 03
status: draft
version: 1.0
tags: [memory, worker-memory, implementation]
related:
  - "[[WorkerMemory-Part01]]"
  - "[[Permission-Part01]]"
---

# WorkerMemory - Part 03

## Document Index

Part 01 - Purpose, Scope, and Worker-Owned Memory
Part 02 - Handoff, Summaries, and Promotion
Part 03 - Safety, UI, and Implementation Checklist

# Safety

WorkerMemory may contain sensitive terminal output. It MUST be classified and redacted before reuse.

Safety checks:

- Workspace boundary
- task relevance
- sensitivity
- secret scan
- permission check
- retention policy

# UI

The Worker panel should show:

- current summary
- artifacts created
- blockers
- handoff package
- redaction warnings

# Implementation Checklist

```text
[ ] Define WorkerMemoryRecord
[ ] Add Worker memory scope
[ ] Add handoff summaries
[ ] Add redaction
[ ] Add promotion flow
[ ] Add UI display
[ ] Add tests for cross-worker leakage
```

# Final AI Notes

WorkerMemory is a bridge between live execution and future continuity. Keep it scoped and clean.

