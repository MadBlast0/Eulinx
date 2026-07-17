---
title: ContextSharing Specification - Part 06
status: draft
version: 1.0
tags:
  - worker-system
  - context-sharing
  - examples
related:
  - "[[ContextSharing-Part01]]"
---

# ContextSharing Specification (Part 06)

## Document Index

Part 01 - Purpose, Principles, and Sharing Model
Part 02 - Artifact-Based Sharing and Summaries
Part 03 - Channels, Permissions, and Boundaries
Part 04 - Events, UI, and Implementation Checklist
Part 05 - Context Diffing, Redaction, and Compression
Part 06 - Examples, Anti-Patterns, and Future Expansion

# Good Example

```text
Backend Worker creates API contract artifact.
Frontend Worker receives only the API contract and relevant notes.
```

# Bad Example

```text
Frontend Worker receives entire backend terminal transcript.
```

# Future Expansion

Future capabilities:

- automatic context routing
- visual context graph
- semantic context diff
- context quality scoring

# Final AI Notes

Context sharing should make Workers coordinated, not overloaded.

# Related Documents

- [[ContextSharing-Part01]]
- [[WorkerCommunication-Part01]]

