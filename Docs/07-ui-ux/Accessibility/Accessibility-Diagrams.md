---
title: Accessibility Diagrams
status: draft
version: 1.0
tags:
  - ui-ux
  - accessibility
  - diagrams
related:
  - "[[07-ui-ux/README]]"
  - "[[Accessibility-Part01]]"
  - "[[Accessibility-Part06]]"
---

# Accessibility Diagrams

These diagrams show the landmark model, the focus cycle, the no-color-alone rule, and the reduced-motion/live-region flow.

## Landmark Model (one each)

```mermaid
graph TD
  BANNER[header role=banner - titleBar]
  NAV[nav role=navigation - sidebar]
  MAIN[main - canvas]
  COMP[complementary - inspector]
  REGION[region - panels]
  FOOTER[footer role=contentinfo - statusBar]
```

## Focus Cycle

```mermaid
graph LR
  SID[sidebar] --> CAN[canvas]
  CAN --> INS[inspector]
  INS --> PAN[panels]
  PAN --> SID
  MOD[modal: focus trapped] -.->|restore on close| TRIG[trigger]
```

## No Color Alone

```mermaid
flowchart LR
  STATUS[status] --> C[color]
  STATUS --> S[shape/icon]
  STATUS --> T[text label]
  C -.->|insufficient alone| FAIL[color-blind fails]
  S --> OK[perceivable]
  T --> OK
```

## Reduced Motion

```mermaid
flowchart TD
  OS[@media reduce] --> OV[tokens -> 0ms]
  OV --> LOOPS[stop pulse/edge-flow]
  OV --> TRANS[instant transitions]
  STATUS[status by color survives] --> OK[info preserved]
```

## Live Region Discipline

```mermaid
flowchart TD
  EV[state change] --> DEB[debounce + filter meaningful]
  DEB --> LIVE[aria-live announce]
  RAW[every frame] -.->|forbidden| SPAM[unreadable SR noise]
```

## Related Documents

- [[07-ui-ux/README]]
- [[Accessibility-Part01]]
- [[Accessibility-Part02]]
- [[Accessibility-Part03]]
- [[Accessibility-Part04]]
- [[Accessibility-Part05]]
- [[Accessibility-Part06]]
- [[WorkspaceLayout-Part01]]
- [[WorkspaceLayout-Part06]]
- [[KeyboardShortcuts-Part01]]
- [[NodeGraph-Part07]]
- [[TerminalView-Part06]]
- [[Animations-Part03]]
- [[DesignTokens-Part03]]
