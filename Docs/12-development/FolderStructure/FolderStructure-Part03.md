---
title: FolderStructure Specification - Part 03
status: draft
version: 1.0
tags:
  - development
  - folder-structure
related:
  - "[[12-development/README]]"
  - "[[FolderStructure-Part02]]"
  - "[[FolderStructure-Part04]]"
---

# FolderStructure Specification (Part 03)

## Document Index

Part 01 - Monorepo Layout & Top-Level Structure
Part 02 - Frontend App Structure (src/)
Part 03 - Rust Backend & Shared Layout
Part 04 - Global Design System First & Staging Order

# Purpose

This part defines the Rust backend layout inside `src-tauri/`. The Rust layer is intentionally small. Its folders reflect the "thin native bridge" mandate: it owns only native OS capabilities and performance-critical work.

# Rust `src-tauri/` Layout

- `src/main.rs` — Tauri entrypoint; builds the app and registers commands.
- `src/lib.rs` — library root exposing the run function and module declarations.
- `src/commands/` — Tauri command handlers (the functions callable via `invoke`). Each command is a thin wrapper that delegates to a manager.
- `src/managers/` — native managers: PTY/terminal manager, filesystem manager, window manager, secure-store manager, dialog manager. These contain the only substantial Rust logic.
- `src/ipc/` — request/response shaping between TypeScript and Rust (DTOs, error mapping).
- `src/state/` — shared application state owned by the Rust runtime (e.g. active PTY handles, managed connections).
- `src/error.rs` — central error type and mapping to frontend error codes.
- `Cargo.toml` — Rust dependencies (tokio, serde, tauri, sqlx, etc.).
- `tauri.conf.json` — Tauri window, bundle, and capability configuration.
- `capabilities/` — permission capability files granting the frontend access to specific commands.
- `icons/` — platform icons and bundling assets.

# Rust Boundary Rule

Rust MUST NOT contain Eulinx business logic such as workflow execution, agent orchestration, memory retrieval, or UI state. Those live in TypeScript. Rust commands receive a request, perform a native operation, and return a typed result. If a Rust file begins to "decide what the app should do," that logic belongs in the services layer.

# Shared Types Location

Domain types are defined once in TypeScript under `src/types/`. Rust DTOs in `src/ipc/` MUST mirror the TypeScript contract field-for-field. The cheap model MUST keep both in sync when changing a cross-boundary shape.

# Related Documents

- [[FolderStructure-Part04]]
- [[ArchitectureRules-Part03]]
- [[AIInstructions-Part02]]
