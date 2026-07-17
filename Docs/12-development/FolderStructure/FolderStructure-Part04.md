---
title: FolderStructure Specification - Part 04
status: draft
version: 1.0
tags:
  - development
  - folder-structure
related:
  - "[[12-development/README]]"
  - "[[FolderStructure-Part03]]"
  - "[[AIInstructions-Part01]]"
---

# FolderStructure Specification (Part 04)

## Document Index

Part 01 - Monorepo Layout & Top-Level Structure
Part 02 - Frontend App Structure (src/)
Part 03 - Rust Backend & Shared Layout
Part 04 - Global Design System First & Staging Order

# Purpose

This part defines the mandatory staging order for creating the project. Because the cheap model builds the app incrementally, the scaffolding MUST be established before any feature is written. This prevents weeks of design-system refactoring later.

# Staging Order (MUST be followed)

Stage 1 — Project init: `pnpm` + Vite + React 19 + TypeScript scaffold; Git initialized; `.gitignore`, `README`, environment template, `.editorconfig`.

Stage 2 — Tooling config: ESLint, Prettier, `tsconfig` strict, Tailwind config, path aliases, editor settings. These gate all later code.

Stage 3 — Global design system FIRST: design tokens, theme system, font wrapper, icon wrapper, layout primitives, overlay manager, providers, global services, global types, global hooks, global utils.

Stage 4 — Tauri shell: `src-tauri` with the minimal thin Rust bridge (PTY, FS, window, secure store, dialog). Capabilities configured.

Stage 5 — Services gateway: the TypeScript `services/` layer wrapping every `invoke`.

Stage 6 — Core runtime scaffolding: event bus client, Zustand stores, TanStack Query provider.

Stage 7 — Features, built incrementally: graph, terminals, agents, workflows, memory, settings, git — one at a time, each in its own feature folder.

# Why Design System Comes Before Features

DeepSeek V4 Flash produces more reliable code when every component already has a global home. Building 200 feature components before tokens exist guarantees duplicated colors, inconsistent spacing, and unthemeable UI. The global design system is the single most leveraged investment in the project.

# What NOT to Build on Day One

Do NOT ask the cheap model to generate the entire component catalog in one pass. Generate the folders, providers, tokens, theme, global wrappers, lint/format/TS config, and Git setup first. Then build components as features need them.

# Related Documents

- [[AIInstructions-Part01]]
- [[CodingStandards-Part01]]
- [[ArchitectureRules-Part01]]
