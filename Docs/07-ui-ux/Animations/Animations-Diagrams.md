---
title: Animations Diagrams
status: draft
version: 1.0
tags:
  - ui-ux
  - animations
  - diagrams
related:
  - "[[07-ui-ux/README]]"
  - "[[Animations-Part01]]"
  - "[[Animations-Part04]]"
---

# Animations Diagrams

These diagrams show the motion vocabulary, the reduced-motion override, the compositor-only rule, and the one-animation-per-transition rule.

## Motion Vocabulary (10 entries)

```mermaid
graph TD
  V[Vocabulary] --> F[focus ring]
  V --> H[hover lift]
  V --> P[panel slide]
  V --> M[modal scale]
  V --> SP[status pulse - loop]
  V --> E[edge flow - loop]
  V --> T[toast in/out]
  V --> X[expand/collapse]
  V --> S[tab switch]
  V --> D[drag ghost]
```

## Reduced Motion Override

```mermaid
flowchart TD
  OS[@media reduce] --> OV[--motion-duration-* = 0ms]
  OV --> INST[all transitions instant]
  OV --> STOP[loops stop; status shown by color]
  LIT[component using literal] -.->|bypasses| BROKEN[anim plays]
```

## Compositor-Only Rule

```mermaid
flowchart LR
  OK[animate transform/opacity] --> GPU[compositor, 60fps]
  BAD[animate width/height/top] --> JANK[layout/paint jank]
```

## One Animation Per Transition

```mermaid
stateDiagram-v2
  [*] --> Transition: state change
  Transition --> One: pick exactly one vocabulary entry
  One --> [*]: animate
  Transition --> Chain: stack 3 animations
  Chain --> [*]: decorative smell - forbidden
```

## Enter/Exit Symmetry

```mermaid
graph LR
  IN[panel slide in: translateX -100%->0] --> OUT[panel slide out: 0->-100%]
```

## Related Documents

- [[07-ui-ux/README]]
- [[Animations-Part01]]
- [[Animations-Part02]]
- [[Animations-Part03]]
- [[Animations-Part04]]
- [[DesignTokens-Part05]]
- [[Accessibility-Part04]]
- [[Accessibility-Part06]]
- [[NodeGraph-Part07]]
- [[NodeGraph-Part08]]
