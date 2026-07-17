---
title: NamingConvention Specification - Part 01
status: draft
version: 1.0
tags:
  - development
  - naming-convention
related:
  - "[[12-development/README]]"
  - "[[NamingConvention-Part02]]"
  - "[[NamingConvention-Part03]]"
---

# NamingConvention Specification (Part 01)

## Document Index

Part 01 - Files, Folders & Packages
Part 02 - Variables, Functions, Types & Components
Part 03 - Events, Stores, Constants & Domain Terms

# Purpose

NamingConvention removes ambiguity for the cheap coding model. Consistent names mean the model can predict a file's location and a symbol's meaning without searching. This part covers files, folders, and packages.

# File & Folder Naming

- Folders and file names (excluding components) MUST use `kebab-case`: `folder-structure`, `agent-service.ts`, `use-terminal.ts`.
- React component files MUST use `PascalCase`: `Button.tsx`, `TerminalView.tsx`.
- Test files MUST mirror the source file name with a `.test.ts(x)` or `.spec.ts(x)` suffix in the same folder: `agent-service.test.ts`.
- Barrel files are named `index.ts`.
- Avoid plural/singular inconsistency in folder names: pick one convention per domain (e.g. always `features/`, never `feature/`).

# Package & Module Naming

- The npm package name is `Eulinx` (or the chosen scoped name), lowercase, no spaces.
- The Rust crate is `Eulinx` (or `Eulinx-desktop`), snake_case per Cargo convention.
- Path alias `@/` maps to `src/`. No other aliases unless approved.

# Abbreviation Policy

Abbreviations are forbidden unless canonical in the domain (e.g. `id`, `url`, `pty`, `ui`, `api`, `db`). "Authentication" MUST be `auth`, not `authen` or `authn`. Never invent cryptic abbreviations.

# Related Documents

- [[NamingConvention-Part02]]
- [[FolderStructure-Part01]]
- [[CodingStandards-Part01]]
