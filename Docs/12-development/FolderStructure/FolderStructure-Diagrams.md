---
title: FolderStructure Diagrams
status: draft
version: 1.0
tags: [development, diagrams]
related:
  - "[[FolderStructure-Part01]]"
---

# FolderStructure Diagrams

```mermaid
flowchart TD
  Root["Repo Root"]
  Root --> SrcTauri["src-tauri/ (Rust thin backend)"]
  Root --> Src["src/ (React + TS frontend)"]
  Root --> Public["public/"]
  Root --> Docs["docs/ (this vault)"]
  Root --> Scripts["scripts/"]
  Src --> App["app/"]
  Src --> Components["components/ (global design system)"]
  Src --> Features["features/ (per-domain)"]
  Src --> Services["services/ (invoke gateway)"]
  Src --> Stores["stores/ (Zustand)"]
  Src --> Themes["themes/ tokens"]
  Features --> Graph["features/graph/"]
  Features --> Terminals["features/terminals/"]
  Features --> Agents["features/agents/"]
```

```text
Repo
├── src-tauri/      Rust: PTY, FS, window, store, dialog
├── src/
│   ├── app/            shell + router + providers
│   ├── components/     GLOBAL design-system wrappers
│   ├── features/       graph/ terminals/ agents/ ... (self-contained)
│   ├── services/       ONLY gateway to invoke()
│   ├── stores/         Zustand client state
│   ├── themes/         tokens (light/dark)
│   ├── hooks/ utils/ types/ constants/ config/
│   └── layouts/ pages/ providers/ contexts/
├── public/  docs/  scripts/
└── configs: package.json vite tsconfig tailwind eslint prettier
```

# Staging Order (text)

```text
1. Init (pnpm + vite + react-ts + git)
2. Tooling (eslint, prettier, strict tsconfig, tailwind, aliases)
3. GLOBAL DESIGN SYSTEM (tokens, theme, fonts, icons, layout, overlay, providers)
4. Tauri shell (thin Rust bridge + capabilities)
5. Services gateway (invoke wrappers)
6. Runtime scaffolding (event bus, stores, query)
7. Features (one at a time, in feature folders)
```

# Related Documents

- [[FolderStructure-Part01]]
- [[ArchitectureRules-Part01]]
