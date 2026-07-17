---
title: DesignTokens Diagrams
status: draft
version: 1.0
tags:
  - ui-ux
  - design-tokens
  - diagrams
related:
  - "[[07-ui-ux/README]]"
  - "[[DesignTokens-Part01]]"
  - "[[DesignTokens-Part06]]"
---

# DesignTokens Diagrams

These diagrams show the token layers, the naming pattern, the theme-to-token flow, and the reduced-motion override.

## Token Layers

```mermaid
graph TD
  P[Primitive: --blue-500] --> S[Semantic: --color-accent]
  S --> C[Component: background var(--color-accent)]
  T[Theme: sets --color-accent] --> S
```

## Naming Pattern

```mermaid
graph LR
  A[--] --> G[group: color|space|font|motion|z]
  G --> R[role: bg|fg|border|accent|status|size]
  R --> V[variant: canvas|surface|running|fast]
```

## Theme Provides Token Values

```mermaid
flowchart TD
  THEME[Theme tokens] --> ROOT[:root custom properties]
  ROOT --> COMP[Components read vars]
  ROOT --> TERM[Terminal maps --color-terminal-*]
  ROOT --> NATIVE[Tauri native hints]
```

## Reduced Motion Override

```mermaid
flowchart TD
  MEDIA[@media reduce] --> OVERRIDE[--motion-duration-* = 0ms]
  OVERRIDE --> ALL[all token-driven motion instant]
  COMP[Components using tokens] --> ALL
  COMP_LIT[Components using literals] -.->|bypass| BROKEN[animation plays]
```

## Layering Scale (z-index)

```mermaid
graph TD
  B[--z-base 0] --> ST[--z-sticky 10]
  ST --> DD[--z-dropdown 100]
  DD --> OV[--z-overlay 200]
  OV --> MO[--z-modal 300]
  MO --> TO[--z-toast 400]
  TO --> TT[--z-tooltip 500]
```

## Related Documents

- [[07-ui-ux/README]]
- [[DesignTokens-Part01]]
- [[DesignTokens-Part02]]
- [[DesignTokens-Part03]]
- [[DesignTokens-Part04]]
- [[DesignTokens-Part05]]
- [[DesignTokens-Part06]]
- [[Themes-Part02]]
- [[Themes-Part04]]
- [[TerminalView-Part04]]
- [[Animations-Part01]]
- [[Accessibility-Part04]]
- [[Accessibility-Part05]]
