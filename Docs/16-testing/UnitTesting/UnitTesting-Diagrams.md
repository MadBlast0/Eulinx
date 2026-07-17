---
title: UnitTesting Diagrams
status: draft
version: 1.0
tags:
  - testing
  - diagrams
related:
  - "[[UnitTesting-Part01]]"
---

# UnitTesting Diagrams

```mermaid
flowchart TD
  T["Vitest test"] --> S["Zustand store / Service"]
  S -->|fake invoke| F["Invoke Fake"]
  T2["cargo test"] --> C["Rust Command"]
  C -->|in-memory FS| M["Mem FS Fake"]
  F --> A["Assert domain result"]
  M --> B["Assert command result"]
```

```text
Unit Layer Isolation
  test -- resets store -- action -- assert state
  test -- programs invoke fake -- service -- assert mapping
  test -- temp dir -- rust command -- assert error shape
```

# Related Documents

- [[UnitTesting-Part01]]
- [[IntegrationTesting-Part01]]
