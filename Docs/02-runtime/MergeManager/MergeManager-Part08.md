---
title: Merge Manager Part 08 - Database, Tests, Checklist
status: draft
version: 1.0
tags:
  - runtime
  - merge-manager
  - database
related:
  - "[[MergeManager-Part01]]"
  - "[[DatabaseArchitecture]]"
---

# Merge Manager Part 08 - Database, Tests, Checklist

## Tables

```text
merge_candidates
merge_attempts
merge_conflicts
merge_verifications
merge_history
merge_rollbacks
```

## Tests

```text
[ ] clean patch applies
[ ] conflicting patch blocks
[ ] patch outside workspace denied
[ ] lock conflict waits
[ ] failed apply rolls back
[ ] human approval required for high risk
[ ] dirty workspace triggers recheck
[ ] merge history is recorded
```

## Implementation Checklist

```text
[ ] MergeCandidate type
[ ] eligibility checks
[ ] verification gate integration
[ ] permission integration
[ ] lock integration
[ ] dry-run patch apply
[ ] rollback support
[ ] merge history
[ ] UI preview model
[ ] EventBus events
```

## Related Documents

- [[ArtifactManager-Part01]]
- [[LockManager-Part01]]
- [[PermissionManager-Part01]]
- [[WorkspaceManager-Part01]]

