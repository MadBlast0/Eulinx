---
title: Typography Diagrams
status: draft
version: 1.0
tags:
  - ui-ux
  - typography
  - diagrams
related:
  - "[[07-ui-ux/README]]"
  - "[[Typography-Part01]]"
  - "[[Typography-Part04]]"
---

# Typography Diagrams

These diagrams show the type scale, the component-type mapping, the density re-point, and the RTL/logical-property rule.

## Type Scale

```mermaid
graph TD
  XS[--font-size-xs 11] --> SM[--font-size-sm 12]
  SM --> MD[--font-size-md 13 base]
  MD --> LG[--font-size-lg 15]
  LG --> XL[--font-size-xl 18]
  XL --> X2[--font-size-2xl 22]
  X2 --> X3[--font-size-3xl 28]
```

## Component Type Mapping

```mermaid
graph LR
  BUTTON[button: md medium] --> SCALE[Type Tokens]
  INPUT[input: md regular] --> SCALE
  TABLE[table: sm tabular] --> SCALE
  CODE[code: mono sm] --> SCALE
  H1[view title: 2xl semibold] --> SCALE
```

## Density Re-Points Root

```mermaid
flowchart TD
  DENS[Density setting] --> ROOT[--font-size-md re-pointed]
  ROOT --> ALL[all components scale together]
  COMF[comfortable 13] --> ROOT
  COMP[compact 12] --> ROOT
```

## RTL via Logical Properties

```mermaid
flowchart LR
  PHYS[physical: padding-left] -.->|breaks RTL| BAD[mirrored wrong]
  LOG[logical: padding-inline-start] --> GOOD[flips with dir=rtl]
```

## Code Block Scroll (not wrap)

```mermaid
graph TD
  CODE[code block] --> SCROLL[overflow-x auto]
  CODE -.->|forbidden| WRAP[wrap mid-token - unreadable]
```

## Related Documents

- [[07-ui-ux/README]]
- [[Typography-Part01]]
- [[Typography-Part02]]
- [[Typography-Part03]]
- [[Typography-Part04]]
- [[DesignTokens-Part04]]
- [[TerminalView-Part04]]
- [[Accessibility-Part05]]
- [[Accessibility-Part06]]
- [[ResponsiveRules-Part03]]
