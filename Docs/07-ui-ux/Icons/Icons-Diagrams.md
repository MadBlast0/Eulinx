---
title: Icons Diagrams
status: draft
version: 1.0
tags:
  - ui-ux
  - icons
  - diagrams
related:
  - "[[07-ui-ux/README]]"
  - "[[Icons-Part01]]"
  - "[[Icons-Part04]]"
---

# Icons Diagrams

These diagrams show the icon size scale, decorative vs labeling, RTL flip, and the "icon never alone" rule.

## Icon Size Scale

```mermaid
graph TD
  XS[--icon-xs 12] --> SM[--icon-sm 14]
  SM --> MD[--icon-md 16 default]
  MD --> LG[--icon-lg 20]
  LG --> XL[--icon-xl 24]
```

## Decorative vs Labeling

```mermaid
flowchart LR
  D[Icon + text "Run"] -->|aria-hidden| OK[decorative, text names it]
  L[Icon-only button] -->|aria-label| OK2[labeling, named]
  M[mysery glyph] -.->|forbidden| BAD[no name, no label]
```

## RTL Flip Set

```mermaid
flowchart LR
  FLIP[directional: arrow/chevron/caret] --> RTL[scale(-1) in dir=rtl]
  NO[close/search/settings/check] --> SAME[unchanged]
```

## Icon Never Alone

```mermaid
graph TD
  KNOWN[known glyph: close/search/menu] --> ALONE[allowed alone + aria-label]
  CUSTOM[custom action: run/connect] --> PAIR[must pair with text/tooltip]
```

## State Conveyance

```mermaid
flowchart TD
  SPIN[spinner icon] --> TXT[+ text or aria-busy/live]
  CHECK[check icon] --> TXT2[+ text or announcement]
  SPIN -.->|forbidden| ICONONLY[icon alone = invisible to SR]
```

## Related Documents

- [[07-ui-ux/README]]
- [[Icons-Part01]]
- [[Icons-Part02]]
- [[Icons-Part03]]
- [[Icons-Part04]]
- [[DesignTokens-Part03]]
- [[DesignTokens-Part04]]
- [[Accessibility-Part03]]
- [[Accessibility-Part06]]
- [[Typography-Part04]]
