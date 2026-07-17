---
title: IntegrationTesting Diagrams
status: draft
version: 1.0
tags:
  - testing
  - diagrams
related:
  - "[[IntegrationTesting-Part01]]"
---

# IntegrationTesting Diagrams

```mermaid
flowchart TD
  SVC["Frontend Service"] --> ROUTER["Tauri Command Router"]
  ROUTER --> CMD["Rust Command"]
  CMD --> SQL["Temp SQLite"]
  CMD --> FS["Temp Project Folder"]
  SVC --> BUS["EventBus"]
  BUS --> SUB["Other Service"]
  MEM["Memory Request"] --> SCOPE["Scope Filter"]
  SCOPE --> PERM["Permission Filter"]
  PERM --> RED["Redaction"]
  RED --> PKG["Context Package"]
```

```text
Integration Seams
  service -> router -> rust -> sqlite
  service -> eventbus -> subscriber
  memory -> scope -> permission -> redact -> package
  all inside an isolated temp workspace
```

# Related Documents

- [[IntegrationTesting-Part01]]
- [[04-memory/ContextInjection-Part01]]
