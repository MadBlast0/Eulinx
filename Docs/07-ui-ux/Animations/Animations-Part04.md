---
title: Animations Specification - Part 04
status: draft
version: 1.0
tags:
  - ui-ux
  - animations
  - checklist
related:
  - "[[07-ui-ux/README]]"
  - "[[Animations-Part03]]"
  - "[[Animations-Diagrams]]"
  - "[[DesignTokens-Part05]]"
  - "[[Accessibility-Part04]]"
---

# Animations Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, Calm by Default
Part 02 - The Motion Vocabulary: What Animates and How
Part 03 - Reduced Motion, Performance, and the Override
Part 04 - State Transitions, the Checklist, and Anti-Patterns
Diagrams - Animations-Diagrams.md

# Purpose of This Part

This part specifies how state transitions use the vocabulary, the implementation checklist, and the anti-patterns to avoid. Animations exist to make state changes legible (a surface opened, a view switched, a process is running). They are not a styling layer. This part closes the animation spec.

# State Transition Mapping

Each app state change maps to at most one vocabulary entry. No state change stacks three animations.

```text
region collapse:      panel slide (translate to 0 width)
panel tab switch:     tab switch (subtle opacity)
modal open/close:     modal scale
tree expand:          expand/collapse (height)
toast notify:         toast in/out
node running:         status pulse (loop) + edge flow (loop)
selection focus:      focus ring (instant)
```

```text
rule:        one animation per transition; no chaining
example:     opening a modal does modal scale only, not slide+scale+fade
```

Chaining multiple animations on one transition is the "decorative" smell Part 01 warns against and it confuses the cheap model about which token to use.

# Enter/Exit Symmetry

If a surface animates in, it animates out the same way (reverse), so the user's mental model is consistent.

```text
panel slide in:   translateX from -100% to 0
panel slide out:  translateX from 0 to -100%
modal in:         scale 0.96->1 + opacity 0->1
modal out:        scale 1->0.96 + opacity 1->0
```

Asymmetry (slide in, instant out) feels broken. Both directions use the same duration token so they match.

# The Implementation Checklist

```text
[ ] Every animation uses motion tokens, never literals.
[ ] Vocabulary limited to the 10 listed entries (Part 02).
[ ] transform/opacity only; no layout-property loops.
[ ] Loops limited to status signals (pulse, edge flow).
[ ] Reduced motion stops all loops, keeps status by color.
[ ] One animation per state transition; no chaining.
[ ] Enter/exit symmetric (same duration/direction).
[ ] Status never conveyed by motion alone (Accessibility-Part06).
[ ] Many-element pulses use CSS classes, not JS timers.
[ ] Focus ring instant (not a tween) but token-colored.
```

# Anti-Patterns

```text
- bounce/overshoot easings (not in vocabulary; contradicts calm)
- celebration/confetti on success (decorative, not informative)
- parallax or scrolling-driven motion (distracting, perf cost)
- staggered list reveals on every render (noise, not info)
- animating width/height/top/left in any loop (jank)
- per-element JS intervals for status pulses (main-thread peg)
- hardcoded durations that ignore reduced-motion (a11y fail)
```

Each anti-pattern either decorates (violating Part 01), janks (violating Part 03), or breaks accessibility (violating [[Accessibility-Part04]]). They are lint-review flagged.

# Known Limitations (v1)

```text
- No physics-based spring animations (intentionally; decelerate
  curves only). A spring system is a future ADR if needed.
- Manual "reduce motion" setting, if added, must force the token
  override; v1 primarily honors the OS media query.
```

# AI Notes

Do not chain animations on one transition. Pick one vocabulary entry. Chaining is decorative and confuses which token applies.

Do not make enter/exit asymmetric. Slide in but instant out feels broken. Use the same duration both ways.

Do not add bounce/celebration/parallax. They are decorative, contradict "calm by default," and are explicit anti-patterns. If tempted, propose an ADR instead.

Do not drive status pulses with JS. Use CSS classes. Per-node `setInterval` on a 200-node graph is a main-thread freeze.

# Related Documents

- [[07-ui-ux/README]]
- [[Animations-Part01]]
- [[Animations-Part02]]
- [[Animations-Part03]]
- [[Animations-Diagrams]]
- [[DesignTokens-Part05]]
- [[Accessibility-Part04]]
- [[Accessibility-Part06]]
- [[NodeGraph-Part07]]
- [[NodeGraph-Part08]]
