---
title: ContextInjection - Part 04
status: draft
version: 1.0
tags: [memory, context-injection, implementation]
related:
  - "[[ContextInjection-Part01]]"
---

# ContextInjection - Part 04

## Document Index

Part 01 - Purpose, Context Package, and Injection Pipeline
Part 02 - Selection, Ranking, and Token Budgeting
Part 03 - Redaction, Permissions, and Safety
Part 04 - UI, Testing, and Implementation Checklist

# UI

The Worker inspector should show:

- what context was injected
- why each item was included
- what was excluded
- token estimate
- redaction warnings

# Testing

Test:

- irrelevant memory excluded
- sensitive memory redacted
- denied artifact excluded
- token budget respected
- handoff included for replacement Worker

# Implementation Checklist

```text
[ ] Define ContextPackage
[ ] Add candidate collection
[ ] Add ranking
[ ] Add permission filtering
[ ] Add redaction
[ ] Add compression
[ ] Add UI inspector
[ ] Add tests
```

# Final AI Notes

Make context packages inspectable. Debugging AI behavior is almost impossible if nobody knows what the Worker saw.

