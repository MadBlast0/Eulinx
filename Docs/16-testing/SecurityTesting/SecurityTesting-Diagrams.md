---
title: SecurityTesting Diagrams
status: draft
version: 1.0
tags:
  - testing
  - diagrams
related:
  - "[[SecurityTesting-Part01]]"
---

# SecurityTesting Diagrams

```mermaid
flowchart TD
  REQ["Action Request"] --> PM["PermissionManager"]
  PM -->|granted| EXEC["Execute"]
  PM -->|denied| REFUSE["refuses_* test passes"]
  EXEC --> EVT["Security Event Emitted"]
  PLUGIN["Plugin Call"] --> BOUND["Plugin Boundary"]
  BOUND -->|in scope| OK["Allowed"]
  BOUND -->|escape attempt| BLOCK["Blocked + logged"]
  SECRET["Secret in memory"] --> RED["Redaction"]
  RED -->|stripped| SAFE["Safe context package"]
```

```text
Refusal-First Pairs
  for each capability:
    should_<action>  when granted
    refuses_<action> when absent
    gate blocks destructive until human approves
```

# Related Documents

- [[SecurityTesting-Part01]]
- [[02-runtime/PermissionManager-Part01]]
