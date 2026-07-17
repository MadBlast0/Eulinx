---
title: Animations Specification - Part 02
status: draft
version: 1.0
tags:
  - ui-ux
  - animations
  - motion
related:
  - "[[07-ui-ux/README]]"
  - "[[Animations-Part01]]"
  - "[[Animations-Part03]]"
  - "[[Animations-Diagrams]]"
  - "[[DesignTokens-Part05]]"
  - "[[NodeGraph-Part05]]"
---

# Animations Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, Calm by Default
Part 02 - The Motion Vocabulary: What Animates and How
Part 03 - Reduced Motion, Performance, and the Override
Part 04 - State Transitions, the Checklist, and Anti-Patterns
Diagrams - Animations-Diagrams.md

# Purpose of This Part

This part enumerates the specific animations Eulinx uses: the motion vocabulary. The set is deliberately small. Each animated thing maps to a motion token ([[DesignTokens-Part05]]) and a clear purpose. The rule from Part 01 — motion answers a question or confirms an action, never decorates — governs every entry here.

# The Vocabulary

```text
1. focus ring         appears on keyboard focus (Accessibility-Part03)
2. hover lift         subtle bg/border shift on interactive rows
3. panel slide        region/panel open-close translate
4. modal scale        dialog enters with slight scale+opacity
5. status pulse       running node/terminal dot pulse
6. edge flow          animated dash on a running graph edge
7. toast in/out       notification slides from --z-toast
8. expand/collapse    tree/section height transition
9. tab switch         content cross-fade (very subtle)
10. drag ghost        follows pointer while dragging
```

That is the whole list. Anything not on it is out of scope for v1 and must be proposed as an ADR. A 10-item vocabulary is small enough for a cheap coding model ([[07-ui-ux/README]]) to apply consistently.

# Purposes Mapped

Each entry answers a question or confirms an action:

```text
focus ring:      "where is the keyboard?" (answers)
hover lift:      "is this interactive?" (answers)
panel slide:     "did the surface open/close?" (confirms)
modal scale:     "a dialog appeared" (confirms)
status pulse:    "is this still running?" (answers liveness)
edge flow:       "is data moving?" (answers liveness)
toast in/out:    "something happened" (confirms)
expand/collapse: "did this section open?" (confirms)
tab switch:      "did the view change?" (confirms, minimal)
drag ghost:      "what am I moving?" (answers)
```

None of these are decorative. A "celebration" animation on task complete, for example, is explicitly excluded — it decorates, it does not inform.

# Duration and Easing Per Entry

```text
focus ring:    0ms appearance (instant), token color transition fast
hover lift:    --motion-duration-fast, --motion-ease-out
panel slide:   --motion-duration-base, --motion-ease-standard
modal scale:   --motion-duration-base, --motion-ease-emphasized
status pulse:  1.2s loop, ease-in-out (token --motion-pulse)
edge flow:     0.6s loop linear (dash offset)
toast:         --motion-duration-base in, fast out
expand:        --motion-duration-base, --motion-ease-standard
tab switch:    --motion-duration-fast, opacity only
drag ghost:    follows pointer (no tween; transform only)
```

Loops (pulse, edge flow) are the only infinite animations, and both are status signals, not decoration. They are the first to be disabled under reduced motion (Part 03).

# Implementation Contract

Every animation uses the token, never a literal, so the reduced-motion override ([[DesignTokens-Part05]]) and the theme can control it.

```css
.panel { transition: transform var(--motion-duration-base) var(--motion-ease-standard); }
```

```text
rule:        animate transform/opacity only (compositor-friendly)
forbidden:   animating layout properties (width/height/top/left) for loops
```

Transform/opacity animations run on the compositor and stay at 60fps. Animating `width` or `top` triggers layout/paint and janks, especially with many nodes ([[NodeGraph-Part08]]).

# AI Notes

Do not add animations outside the vocabulary. Propose an ADR. A new bounce/celebration effect breaks "calm by default" and confuses the cheap model's consistency.

Do not animate layout properties for loops. Use transform/opacity. Animating `width`/`top` on a running-edge pulse or status dot will jank the whole app.

Do not use literal durations. Read motion tokens. Literals bypass the reduced-motion override and the theme's motion tuning.

Do not make loops decorative. The only infinite animations are status signals (pulse, edge flow). A decorative loop is exactly what Part 01 forbids.

# Related Documents

- [[07-ui-ux/README]]
- [[Animations-Part01]]
- [[Animations-Part03]]
- [[Animations-Part04]]
- [[Animations-Diagrams]]
- [[DesignTokens-Part05]]
- [[NodeGraph-Part05]]
- [[NodeGraph-Part07]]
- [[NodeGraph-Part08]]
- [[Accessibility-Part03]]
- [[TerminalCards-Part05]]
