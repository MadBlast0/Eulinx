---
title: GitWorkflow Diagrams
status: draft
version: 1.0
tags: [development, diagrams]
related:
  - "[[GitWorkflow-Part01]]"
---

# GitWorkflow Diagrams

```mermaid
flowchart TD
  Main["main (releasable)"]
  Branch["feat/kebab-slug"]
  PR["Pull Request"]
  CI["CI gate: lint+fmt+tsc+test+build"]
  Review["Human/reviewer approval"]
  Merge["Squash merge + delete branch"]
  Main --> Branch
  Branch --> PR
  PR --> CI
  CI --> Review
  Review --> Merge
  Merge --> Main
```

```text
Branch & commit flow
====================
main ◀── PR ◀── feat/terminal-pane
                ├── feat(terminals): add split pane      [atomic]
                ├── feat(terminals): wire resize handle  [atomic]
                └── test(terminals): resize behavior     [atomic]

commit subject: type(scope): summary   (<=72 chars)
merge: squash -> linear main, branch deleted
```

# Related Documents

- [[GitWorkflow-Part01]]
- [[TestingRules-Part01]]
