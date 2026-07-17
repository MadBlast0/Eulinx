---
title: WorkerTermination Specification - Part 05
status: draft
version: 1.0
tags:
  - worker-system
  - worker-termination
  - postmortem
related:
  - "[[WorkerTermination-Part01]]"
---

# WorkerTermination Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, and Termination Types
Part 02 - Graceful Shutdown, Forced Kill, and Cleanup
Part 03 - Artifacts, Memory, Logs, and Handoff
Part 04 - Failures, Events, UI, and Implementation Checklist
Part 05 - Post-Mortem Records, Child Cascade, and Future Expansion

# Purpose

This final part defines the post-mortem record created after Worker termination and how termination affects child Workers.

# Post-Mortem Record

```ts
type WorkerPostMortem = {
  id: string;
  workerId: string;
  taskId?: string;
  terminationReason: string;
  finalState: string;
  exitCode?: number;
  artifactIds: string[];
  handoffPackageId?: string;
  locksReleased: string[];
  grantsRevoked: string[];
  childDisposition: "terminated" | "reparented" | "orphaned_failed" | "none";
  summary: string;
  createdAt: string;
};
```

# Child Cascade

When a parent Worker terminates, Eulinx must decide what happens to children.

Options:

```text
terminate_children
reparent_to_orchestrator
allow_to_finish
pause_children
fail_children
```

The default should be determined by task relationship and safety mode.

# Future Expansion

Future termination capabilities may include:

- pause-and-freeze Worker snapshots
- resumable Workers
- remote Worker termination
- post-mortem quality scoring
- automatic replacement Worker creation

# Final AI Notes

Worker death should produce useful evidence, not just silence.

# Related Documents

- [[WorkerTermination-Part01]]
- [[WorkerHierarchy-Part01]]
- [[WorkerMemory-Part01]]

