---
title: PromptTemplates Diagrams
status: draft
version: 1.0
tags: [ai-context, diagrams]
related: ["[[PromptTemplates-Part01]]"]
---

# PromptTemplates Diagrams

```mermaid
flowchart TD
  subgraph P1["Part 01 - coding skeletons"]
    A["Skeleton A: runtime service (TS)"]
    B["Skeleton B: UI component (token-driven)"]
    C["Skeleton C: EventBus subscription"]
  end
  subgraph P2["Part 02 - arch/spec/feature"]
    D["Skeleton D: write spec Part (prose only)"]
    E["Skeleton E: roadmap phase slice"]
    F["Skeleton F: Worker capability safely"]
  end
  IN["Paste to cheap model\nfill brackets, ONE small task"] --> P1
  IN --> P2
  P1 -->|"always attach"| SPEC["relevant spec Part links"]
  P2 -->|"always attach"| SPEC
```

```text
PROMPT TEMPLATE CATALOG  (reusable skeletons for the cheap model)

PART 01  coding-task skeletons
  A  implement a runtime service (TypeScript only, deterministic)
  B  implement a UI component (token-driven, shadcn wrapper)
  C  wire an EventBus subscription (listen + unlisten, no optimistic)

PART 02  architecture / spec / feature skeletons
  D  write/extend a spec Part (prose-only, NO-CODE rule)
  E  implement a roadmap phase slice (small, deps pinned)
  F  build a Worker capability safely (ToolRegistry + PermissionManager)

RULE FOR ALL: ONE small verifiable task per prompt
             always attach spec Part links as context
```

# Related Documents

- [[PromptTemplates-Part01]]
- [[06-workflow-engine/README]]
- [[07-ui-ux/README]]
- [[04-memory/README]]
- [[12-development/README]]
