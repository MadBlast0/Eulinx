---
title: ReleaseProcess Diagrams
status: draft
version: 1.0
tags: [development, diagrams]
related:
  - "[[ReleaseProcess-Part01]]"
---

# ReleaseProcess Diagrams

```mermaid
flowchart TD
  Tag["tag vX.Y.Z from main"] --> Gate["CI: lint+fmt+tsc+tests+build"]
  Gate --> Rust["cargo build --release (win/mac/linux)"]
  Rust --> Bundle["Tauri bundle (msi/dmg/appimage)"]
  Bundle --> Sign["code-sign + notarize"]
  Sign --> Publish["upload + signed manifest"]
  Publish --> Update["in-app updater verifies signature"]
```

```text
Versioning
==========
MAJOR : breaking UX / data model / graph format
MINOR : backward-compatible feature
PATCH : bug fix / hardening

Rollback
========
bad release -> ship new PATCH (never rewrite tag)
updater    -> verify signature, allow pin/ignore
breaking   -> migration + MAJOR bump
```

# Related Documents

- [[ReleaseProcess-Part01]]
- [[GitWorkflow-Part01]]
