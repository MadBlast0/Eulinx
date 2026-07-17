---
title: Context Manager Part 06 - Database, Events, Tests
status: draft
version: 1.0
tags:
  - runtime
  - context-manager
  - database
related:
  - "[[ContextManager-Part01]]"
  - "[[EventBus-Part01]]"
---

# Context Manager Part 06 - Database, Events, Tests

## Tables

```text
context_packages
context_sources
context_redactions
context_usage
```

## Events

```text
context.requested
context.created
context.redacted
context.delivered
context.rejected
```

## Tests

```text
[ ] includes required task instruction
[ ] excludes unauthorized memory
[ ] redacts secrets
[ ] respects token budget
[ ] prefers artifacts over transcripts
[ ] builds different packets for Worker and Orchestrator
```

## Implementation Checklist

```text
[ ] ContextRequest type
[ ] ContextPackage type
[ ] source selector
[ ] token estimator
[ ] redaction pipeline
[ ] PermissionManager integration
[ ] MemoryManager integration
[ ] ArtifactManager integration
```

