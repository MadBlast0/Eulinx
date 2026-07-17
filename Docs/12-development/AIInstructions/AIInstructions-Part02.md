---
title: AIInstructions Specification - Part 02
status: draft
version: 1.0
tags:
  - development
  - ai-instructions
related:
  - "[[12-development/README]]"
  - "[[AIInstructions-Part01]]"
  - "[[AIInstructions-Part03]]"
---

# AIInstructions Specification (Part 02)

## Document Index

Part 01 - The Model, The Rule File & Global Context Pack
Part 02 - Task Granularity & The "Small Focused Tasks" Policy
Part 03 - Forbidden Actions & Guardrails
Part 04 - Prompting Pattern & Handoff Protocol

# Purpose

This part defines how work is decomposed for the cheap model. Large prompts reliably produce lower-quality output; small, focused tasks reliably produce working code.

# The Small Focused Tasks Policy (MUST)

Never instruct the model to "build the whole automation system" in one prompt. Break every feature into a numbered sequence of small, independently verifiable tasks. Each task MUST map to roughly one file or one cohesive unit and MUST be completable and testable on its own.

# Example Decomposition (terminals feature)

1. Create the terminal Zustand store shape (`useTerminalStore`).
2. Implement `terminal.service.ts` wrapping the Rust `invoke` for spawn/resize/write.
3. Build the `TerminalView` component using xterm.js and the global design tokens.
4. Add split-pane resize using the layout primitive.
5. Wire streaming output from the PTY service to the view.
6. Write unit tests for the store and service.
7. Run lint + typecheck + tests; fix failures.

# Why This Works for DeepSeek V4 Flash

Community experience shows the model is strong for standard coding but can hallucinate on very large architectural changes. Small tasks keep each generation within the model's reliable envelope and make failures easy to localize and fix.

# Staging Note

The model MUST follow the staging order in [[FolderStructure-Part04]]: scaffolding, tooling, global design system, Tauri shell, services gateway, runtime scaffolding, then features one at a time.

# Related Documents

- [[AIInstructions-Part03]]
- [[FolderStructure-Part04]]
- [[GitWorkflow-Part02]]
