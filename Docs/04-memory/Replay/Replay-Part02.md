---
title: Replay Memory - Part 02
status: draft
version: 1.0
tags: [memory, replay, security]
related:
  - "[[Replay-Part01]]"
---

# Replay Memory - Part 02

## Document Index

Part 01 - Purpose, Replay Sources, and Reconstruction
Part 02 - Timeline, Security, and User Inspection
Part 03 - Implementation Checklist and Future Expansion

# Timeline

Replay should show events in order:

```text
task created
worker spawned
artifact created
verification failed
repair worker spawned
approval granted
merge completed
```

# Security

Replay must not expose redacted secrets.

Sensitive replay entries should require permission to view.

# User Inspection

Users should be able to inspect why the system made each major move.

