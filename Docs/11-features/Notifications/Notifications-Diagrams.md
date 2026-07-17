---
title: Notifications Diagrams
status: draft
version: 1.0
tags:
  - features
  - notifications
  - diagrams
related:
  - "[[Notifications-Part01]]"
---

# Notifications Diagrams

```mermaid
flowchart TD
  EB["EventBus"] --> R["Routing Rules"]
  R --> T["Toasts"]
  R --> I["Inbox"]
  R --> O["OS Notification (critical)"]
  I --> ACK["Acknowledgement"]
```

```text
events -> routing -> toast / inbox / os
acknowledge critical
```

# Related Documents

- [[Notifications-Part01]]
