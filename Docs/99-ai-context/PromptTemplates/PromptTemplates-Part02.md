---
title: PromptTemplates - Part 02
status: draft
version: 1.0
tags:
  - ai-context
  - prompt-templates
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/PromptTemplates/PromptTemplates-Part01]]"
  - "[[13-roadmap/README]]"
---

# PromptTemplates (Part 02) — Architecture, Spec, and Feature Skeletons

## Document Index

Part 01 - Coding-task prompt skeletons for the AI coding model
Part 02 - Architecture / spec and feature prompt skeletons

## Skeleton D — Write or extend a specification Part (prose only)

```text
You are writing ONE specification Part for Eulinx's Obsidian vault (architecture/design
plans, NOT code). Target: <Topic>/<Topic>-PartNN.md.

Read first:
- [[AUTHORING-TEMPLATE]] (format, NO-CODE rule, partitioning)
- [[04-memory/README]] (canonical format model)
- The sibling Parts of <Topic> for consistency.

Rules:
- Frontmatter: title, status: draft, version: 1.0, tags (2-4 kebab), related (wikilinks).
- Include a "## Document Index" listing all Parts of the topic.
- Prose only. Inline `code spans` OK. Bullet field lists OK.
- NO fenced code of any language. Diagrams only ```mermaid / ```text.
- Use [[Wikilink]] for cross-references.
- End with "# Related Documents".
Write ~2-4 pages of concrete, Eulinx-specific content. No placeholders.
```

## Skeleton E — Implement a roadmap phase slice

```text
You are implementing a slice of Eulinx roadmap phase <N> (see [[13-roadmap/README]]).
Prerequisites that already exist: <list>.
Read first: <relevant spec Parts>.

Task (SMALL, one pass): <specific slice>.
Do NOT implement the whole phase. Do NOT skip dependency phases.
Rust stays thin (PTY/fs/window/secure-store/dialogs only).
Prove the headless loop before any UI.
Acceptance criteria: <list>. Tests included.
```

## Skeleton F — Build a Worker capability safely

```text
Task: Add <capability> to Workers via the ToolRegistry + PermissionManager.
Rules:
- Worker receives the tool; it does NOT get random capabilities.
- Destructive actions require explicit human approval (fail-closed).
- Provider keys stay in OS secure store; never in SQLite or logs.
- Worker output is an Artifact; MergeManager applies it under LockManager.
Read: [[02-runtime/README]], [[05-artifacts/README]], [[09-plugin-system/README]].
```

## AI Notes

When asking the model to write docs, remind it of the NO-CODE rule explicitly.

When asking for a feature, pin the prerequisite phases so the model does not assume missing services.

## Related Documents

- [[99-ai-context/PromptTemplates/PromptTemplates-Part01]]
- [[13-roadmap/README]]
- [[12-development/README]]
