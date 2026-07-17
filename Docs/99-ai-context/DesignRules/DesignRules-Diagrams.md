---
title: DesignRules Diagrams
status: draft
version: 1.0
tags: [ai-context, diagrams]
related: ["[[DesignRules-Part01]]"]
---

# DesignRules Diagrams

```mermaid
flowchart TD
  subgraph D1D4["Part 01 - tokens & theming"]
    D1["D1 tokens, never hardcoded"]
    D2["D2 light/dark runtime switch"]
    D3["D3 wrap shadcn/ui, don't fork"]
    D4["D4 global components + overlay manager"]
  end
  subgraph D5D8["Part 02 - layout / motion / a11y"]
    D5["D5 three-pane resizable layout"]
    D6["D6 motion as information"]
    D7["D7 accessibility baseline"]
    D8["D8 responsive / viewport-aware"]
  end
  D1 --> D2 --> D3 --> D4
  D4 --> D5 --> D6 --> D7 --> D8
  D3 -->|"Lucide ->"| ICON["one icon wrapper"]
  D3 -->|"fonts ->"| FONT["centralized fonts"]
```

```text
DESIGN RULES  (inherit from 07-ui-ux)

PART 01  tokens & theming
  D1  token-driven, NO hardcoded color/spacing/typography
  D2  light + dark at runtime; calm dark default + one accent
  D3  Tailwind + shadcn/ui WRAPPED; Lucide via one icon component
  D4  global wrappers for ~25 primitives; one overlay manager
        (dialog/dropdown/menu/tooltip/popover/context/bottom-sheet)

PART 02  layout / motion / a11y / responsive
  D5  three-pane resizable: nav | canvas | context
  D6  motion = feedback/observability, not decoration; reduced-motion
  D7  a11y baseline: focus, ARIA, keyboard, high-contrast
  D8  overlays do collision detection; virtualize long lists
```

# Related Documents

- [[DesignRules-Part01]]
- [[06-workflow-engine/README]]
- [[07-ui-ux/README]]
- [[04-memory/README]]
- [[12-development/README]]
