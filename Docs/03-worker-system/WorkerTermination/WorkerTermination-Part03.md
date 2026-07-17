---
title: WorkerTermination Specification - Part 03
status: draft
version: 1.0
tags:
  - worker-system
  - worker-termination
  - artifacts
  - memory
related:
  - "[[ArtifactManager-Part01]]"
  - "[[MemoryManager-Part01]]"
---

# WorkerTermination Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, and Termination Types
Part 02 - Graceful Shutdown, Forced Kill, and Cleanup
Part 03 - Artifacts, Memory, Logs, and Handoff
Part 04 - Failures, Events, UI, and Implementation Checklist

# Artifact Preservation

Before termination completes, Eulinx SHOULD preserve:

- completed artifacts
- partial artifacts if useful
- patch drafts
- review notes
- test reports
- terminal logs

Partial artifacts must be marked clearly.

# Memory Summary

When a Worker stops, MemoryManager may create a termination summary.

Summary should include:

- task objective
- final status
- useful findings
- created artifacts
- unresolved blockers
- next recommended action
- warnings or policy issues

# Handoff

If the Task continues with another Worker, termination should produce a handoff package.

```ts
type WorkerHandoffPackage = {
  workerId: string;
  taskId: string;
  summary: string;
  artifactIds: string[];
  relevantLogRefs: string[];
  blockers: string[];
  nextSteps: string[];
};
```

# Logs

Worker logs should include:

- terminal output
- runtime events
- tool invocations
- permission decisions
- artifact creation
- termination reason

# AI Notes

Do not throw away a Worker's partial work just because it failed.

Failed Workers often produce useful debugging context.

# Related Documents

- [[WorkerTermination-Part04]]
- [[ArtifactManager-Part01]]
- [[MemoryManager-Part01]]

