---
title: CodingStandards Specification - Part 03
status: draft
version: 1.0
tags:
  - development
  - coding-standards
related:
  - "[[12-development/README]]"
  - "[[CodingStandards-Part02]]"
  - "[[CodingStandards-Part04]]"
---

# CodingStandards Specification (Part 03)

## Document Index

Part 01 - TypeScript Language Rules
Part 02 - React & Component Rules
Part 03 - Rust Thin-Backend Rules
Part 04 - Lint, Format, Typecheck & Enforcement

# Purpose

This part defines rules for the Rust thin backend. Rust is the smallest, most error-prone-for-cheap-models layer, so its surface area is deliberately constrained.

# Rust Thin-Backend Rules

Rust MUST remain a thin native bridge. It owns only: PTY/terminal management, filesystem access, window management, OS secure storage, native dialogs, and small performance-critical utilities.

Rust MUST NOT contain Eulinx business logic: no workflow execution, no agent orchestration, no memory retrieval, no UI state.

Every Tauri command MUST be a thin handler that delegates to a manager in `src/managers/`. Commands MUST NOT embed decision logic.

All command inputs and outputs MUST be typed serde structs (DTOs) that mirror the TypeScript contract in `src/types/`.

Errors MUST use a single crate error type mapped to stable frontend error codes. Do not return raw strings.

The async runtime is Tokio. Blocking OS calls (PTY, FS) MUST be wrapped appropriately to avoid blocking the async executor.

`unsafe` MUST NOT be used except in a reviewed, documented, isolated utility, and SHOULD be avoided entirely for the cheap model's edits.

Dependencies MUST be kept minimal. Before adding a crate, confirm the capability is not already present in the approved set (tokio, serde, tauri, sqlx, tantivy, lancedb, reqwest, tokio-tungstenite, notify, tracing).

# Why Rust Stays Small

DeepSeek V4 Flash handles Rust worse than TypeScript: borrow-checker, lifetime, and trait errors consume iterations. Keeping Rust tiny means the cheap model rarely touches it, and when it does, the change is a small, well-bounded command.

# Related Documents

- [[CodingStandards-Part04]]
- [[FolderStructure-Part03]]
- [[ArchitectureRules-Part03]]
