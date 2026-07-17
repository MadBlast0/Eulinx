---
title: FolderStructure Specification - Part 01
status: draft
version: 1.0
tags:
  - development
  - folder-structure
  - flow:P00-REPO
  - flow:P00-MONOREPO
  - flow:P00-PKG
  - flow:P00-APP
  - flow:P00-SCRIPTS
related:
  - "[[12-development/README]]"
  - "[[FolderStructure-Part02]]"
  - "[[ArchitectureRules-Part01]]"
---

# FolderStructure Specification (Part 01)

## Document Index

Part 01 - Monorepo Layout & Top-Level Structure
Part 02 - Frontend App Structure (src/)
Part 03 - Rust Backend & Shared Layout
Part 04 - Global Design System First & Staging Order

# Purpose

FolderStructure defines the physical organization of the Eulinx codebase. A predictable, feature-based layout is the foundation of AI-friendly development: the cheap coding model must be able to locate the right file by convention without a search through the whole tree.

# Top-Level Monorepo Layout

Eulinx is a single Tauri v2 application, not a multi-package monorepo with published packages. The repository root contains the Tauri shell, the frontend app, and the Rust backend side by side.

The root MUST contain:

- `src-tauri/` — the Rust backend and Tauri configuration (Cargo manifest, `tauri.conf.json`, icons, capabilities).
- `src/` — the React 19 + TypeScript frontend application.
- `public/` — static assets served as-is (favicons, index shell).
- `docs/` — project documentation, including this specification vault.
- `scripts/` — build, codegen, and maintenance scripts run via pnpm.
- Configuration files at root: `package.json`, `pnpm-workspace.yaml` (if used), `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `eslint.config.js`, `prettier.config.js`, `.editorconfig`, `.gitignore`, `CLAUDE.md`, `README.md`, `LICENSE`.

# Why a Single App, Not Many Packages

The cheap model performs better when imports are simple and local. A workspace of many internal packages adds resolution complexity, version churn, and "which package owns this" ambiguity. Eulinx therefore keeps one `src/` tree and treats internal modules as folders, not published packages. The Rust side similarly stays in one crate unless a genuine native boundary appears.

# Root Configuration Ownership

- `pnpm` is the ONLY frontend package manager. `npm` and `yarn` lockfiles MUST NOT be committed.
- `cargo` is the ONLY Rust package manager; it is invoked by Tauri, not manually in most flows.
- `vite` is the build tool for the frontend; configuration lives in `vite.config.ts`.
- TypeScript strict mode is enabled in `tsconfig.json`; path aliases are defined there (e.g. `@/`).

# Related Documents

- [[FolderStructure-Part02]]
- [[ArchitectureRules-Part01]]
- [[ProjectRules-Part01]]
