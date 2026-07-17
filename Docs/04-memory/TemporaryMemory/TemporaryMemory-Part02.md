---
title: TemporaryMemory - Part 02
status: draft
version: 1.0
tags: [memory, temporary-memory, implementation]
related:
  - "[[TemporaryMemory-Part01]]"
---

# TemporaryMemory - Part 02

## Document Index

Part 01 - Purpose, Lifetime, and Usage
Part 02 - Cleanup, Safety, and Implementation

# Cleanup

Cleanup should run when:

- Worker ends
- Task completes
- Session closes
- TTL expires
- user clears memory

# Safety

TemporaryMemory must still respect sensitivity rules. Temporary does not mean safe.

# Implementation Checklist

```text
[ ] Add TTL field
[ ] Add cleanup worker
[ ] Add scope filters
[ ] Add redaction
[ ] Add tests for expiry
```

# Final AI Notes

TemporaryMemory should disappear predictably. If it keeps affecting future Workers unexpectedly, it is no longer temporary.

