---
title: CodingStandards Specification - Part 02
status: draft
version: 1.0
tags:
  - development
  - coding-standards
related:
  - "[[12-development/README]]"
  - "[[CodingStandards-Part01]]"
  - "[[CodingStandards-Part03]]"
---

# CodingStandards Specification (Part 02)

## Document Index

Part 01 - TypeScript Language Rules
Part 02 - React & Component Rules
Part 03 - Rust Thin-Backend Rules
Part 04 - Lint, Format, Typecheck & Enforcement

# Purpose

This part defines rules for React components and hooks. Components are the visible surface of Eulinx; they MUST remain presentational and free of business logic.

# Component Rules

Every component MUST be a function component. Class components are forbidden.

Components MUST be presentational where possible. Business logic, data fetching, and backend calls MUST live in the services layer or hooks, never inline in a component body.

No inline styles. All styling MUST use Tailwind utility classes referencing global design tokens. Dynamic styles MUST come from token-driven classes or CSS variables defined in the theme system.

Components MUST NOT call Tauri `invoke` directly. They MUST consume a service through a hook or a store. This keeps the IPC boundary single and testable.

Props MUST be typed with an explicit interface. Destructured props MUST have defaults declared via default parameters or `withDefaults`-style handling, never implicit `undefined` access without a guard.

Accessibility is mandatory: semantic elements, ARIA where needed, focus management, and reduced-motion support MUST be respected. Radix primitives (via shadcn/ui) are the preferred base.

# Hook Rules

Custom hooks MUST be named with the `use` prefix and return typed values.

Hooks MUST encapsulate reusable stateful logic; they MUST NOT perform side effects that belong in services (e.g. direct `invoke`).

`useEffect` MUST declare its dependency array fully; empty-array effects MUST be intentional and documented.

Memoization (`useMemo`, `useCallback`, `React.memo`) SHOULD be applied to expensive components and callbacks to avoid unnecessary re-renders, but MUST NOT be applied dogmatically to trivial values.

# Performance Rules

Routes and heavy panels MUST be lazy-loaded. Virtualized lists MUST be used for any unbounded collection (terminals, history, chat). React Suspense MAY be used for lazy boundaries.

# Related Documents

- [[CodingStandards-Part03]]
- [[ArchitectureRules-Part02]]
- [[FolderStructure-Part02]]
