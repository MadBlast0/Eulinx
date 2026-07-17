---
title: ArchitectureRules Diagrams
status: draft
version: 1.0
tags: [development, diagrams]
related:
  - "[[ArchitectureRules-Part01]]"
---

# ArchitectureRules Diagrams

```mermaid
flowchart TD
  UI["UI Layer (React, presentational)"]
  SVC["Services Layer (invoke gateway, TS logic)"]
  IPC["Tauri IPC (invoke bridge)"]
  RUST["Rust Backend (thin native bridge)"]
  UI -->|"MUST go through"| SVC
  SVC --> IPC
  IPC --> RUST
  RUST -.->|"never imports upward"| IPC
  IPC -.->|"never imports upward"| SVC
  SVC -.->|"never imports upward"| UI
  DESIGN["Global Design System (tokens, theme, overlays)"] -.governs.-> UI
```

```text
ALLOWED dependency direction (down only)
=========================================
UI  ──▶  Services  ──▶  IPC  ──▶  Rust

FORBIDDEN
=========
UI ──▶ invoke (direct)         [use services]
UI ──▶ business logic          [use services/stores]
feature A ──▶ feature B store  [promote to shared]
circular imports                [forbidden]
Rust ──▶ decides app behavior  [belongs in TS]
```

# Related Documents

- [[ArchitectureRules-Part01]]
- [[FolderStructure-Part04]]
