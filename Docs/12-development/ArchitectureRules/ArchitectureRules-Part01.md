---
title: ArchitectureRules Specification - Part 01
status: draft
version: 1.0
tags:
  - development
  - architecture-rules
related:
  - "[[12-development/README]]"
  - "[[ArchitectureRules-Part02]]"
  - "[[ArchitectureRules-Part03]]"
---

# ArchitectureRules Specification (Part 01)

## Document Index

Part 01 - Layer Boundaries & The Invoke Rule
Part 02 - No Merged Layers & Feature Isolation
Part 03 - Global Design-System-First Mandate

# Purpose

ArchitectureRules defines the non-negotiable structural boundaries of Eulinx. These boundaries are what keep a cheap coding model from producing a tangled, unmaintainable app. The rules are fewer but stricter than coding style: violating them corrupts the whole architecture.

# The Four Layers

Eulinx has exactly four conceptual layers, from top to bottom:

1. UI Layer — React components, pages, panels, layout. Presentational only.
2. Services Layer — TypeScript modules that wrap Tauri `invoke` and contain client-side coordination logic.
3. IPC Bridge — the Tauri `invoke` boundary between TypeScript and Rust.
4. Rust Backend — thin native bridge (PTY, FS, windows, secure store, dialogs).

# The Invoke Rule (MUST)

The UI layer MUST NOT call Tauri `invoke` directly. Every backend call MUST pass through the services layer. This single rule gives one auditable gateway, makes the IPC contract testable, and lets the cheap model reason about "where backend calls live."

# The Business-Logic Rule (MUST)

Business logic MUST NOT live in the UI layer. Orchestration, scheduling decisions, memory selection, artifact merging coordination, and workflow control flow are TypeScript services (or deterministic runtime services), never component code.

# The Rust Boundary Rule (MUST)

Rust MUST NOT contain Eulinx business logic. It performs native operations and returns typed results. If a Rust module starts "deciding app behavior," that logic belongs in TypeScript.

# Direction of Dependencies

Dependencies flow downward only: UI → Services → IPC → Rust. Lower layers MUST NOT import upper layers. The Rust backend MUST NOT know about React; the services layer MUST NOT be imported by a component as a dumping ground for logic.

# Related Documents

- [[ArchitectureRules-Part02]]
- [[FolderStructure-Part02]]
- [[CodingStandards-Part02]]
