---
title: CodingStandards Specification - Part 01
status: draft
version: 1.0
tags:
  - development
  - coding-standards
  - flow:P00-CONFIGS
related:
  - "[[12-development/README]]"
  - "[[CodingStandards-Part02]]"
  - "[[CodingStandards-Part03]]"
  - "[[CodingStandards-Part04]]"
---

# CodingStandards Specification (Part 01)

## Document Index

Part 01 - TypeScript Language Rules
Part 02 - React & Component Rules
Part 03 - Rust Thin-Backend Rules
Part 04 - Lint, Format, Typecheck & Enforcement

# Purpose

CodingStandards defines the mandatory style and quality rules for every line of Eulinx code. These rules exist because the cheap coding model produces the most reliable output when the target style is unambiguous and enforced by tooling rather than by memory.

# TypeScript Language Rules

TypeScript MUST run in strict mode. The `strict` flag and `noImplicitAny` MUST be enabled; `any` is forbidden in shipped code. When a type is genuinely unknown at a boundary, use `unknown` and narrow it.

Imports MUST be absolute via the `@/` path alias. Relative `../` chains deeper than one level MUST be avoided.

Barrel exports (`index.ts`) SHOULD be used at feature boundaries so consumers import from the folder, not deep paths.

No duplicated logic: if the same transformation appears in two places, it MUST be extracted to `utils/`.

Prefer composition over inheritance. React and TypeScript have no meaningful inheritance model here; share behavior through hooks, components, and utilities.

Functions MUST be small and single-purpose. A function longer than roughly 60 lines is a signal to decompose.

`const` is preferred over `let`; mutation MUST be explicit and minimized.

No console errors left in committed code; structured logging via the established logger MUST be used instead.

Enumerations: prefer string literal union types over TS `enum` for serializable, AI-friendly shapes.

# Type-Only Imports

Type imports MUST use `import type` so they are erased at compile time and clearer to the cheap model.

# Error Handling

Errors MUST be typed and propagated; do not swallow errors silently. Cross-boundary errors MUST map to a stable error code the UI can present.

# Related Documents

- [[CodingStandards-Part02]]
- [[NamingConvention-Part01]]
- [[ArchitectureRules-Part01]]
