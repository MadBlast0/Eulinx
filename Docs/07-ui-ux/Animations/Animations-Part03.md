---
title: Animations Specification - Part 03
status: draft
version: 1.0
tags:
  - ui-ux
  - animations
  - reduced-motion
related:
  - "[[07-ui-ux/README]]"
  - "[[Animations-Part02]]"
  - "[[Animations-Part04]]"
  - "[[Animations-Diagrams]]"
  - "[[DesignTokens-Part05]]"
  - "[[Accessibility-Part04]]"
---

# Animations Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, Calm by Default
Part 02 - The Motion Vocabulary: What Animates and How
Part 03 - Reduced Motion, Performance, and the Override
Part 04 - State Transitions, the Checklist, and Anti-Patterns
Diagrams - Animations-Diagrams.md

# Purpose of This Part

This part specifies reduced-motion handling and performance constraints for animation. Reduced motion is not optional polish; it is an accessibility requirement ([[Accessibility-Part04]]). The mechanism is the single token override from [[DesignTokens-Part05]]; this part says what that means for each vocabulary entry and for CPU.

# The Reduced-Motion Override

The single switch re-points all motion durations to `0ms` via a media query. Components using tokens get it for free; components using literals do not.

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration-fast: 0ms;
    --motion-duration-base: 0ms;
    --motion-duration-slow: 0ms;
    --motion-pulse: 0ms;          /* stops loops */
  }
}
```

```text
result:    all token-driven transitions become instant
result:    pulse/edge-flow loops stop (duration 0 = no animation)
requirement: every animated thing MUST use tokens (Animations-Part02)
```

This is the cleanest possible design: one override, total coverage, no per-component media queries to forget.

# Per-Entry Behavior Under Reduced Motion

```text
focus ring:      stays (it is a static outline, not motion)
hover lift:      becomes instant color change (no tween)
panel slide:     instant show/hide (no translate)
modal scale:     instant show (no scale)
status pulse:    stops; dot stays solid (status still shown by color)
edge flow:       stops; edge stays solid (running still shown by color)
toast:           instant in/out
expand/collapse: instant open/close
tab switch:      instant (already minimal)
drag ghost:      follows pointer (no tween needed)
```

Crucially, status is NEVER conveyed by motion alone ([[Accessibility-Part06]]). When the pulse stops, the color still says "running." Reduced motion removes the animation, not the information.

# Performance Constraints

Even with motion on, animations must be cheap:

```text
animate:    transform, opacity only (compositor thread)
avoid:      width/height/top/left/box-shadow transitions in loops
budget:     total animated elements < 60 at once without jank
many nodes: status pulse on 200 nodes uses CSS animation (GPU),
            not JS timers driving each node
```

The graph can have hundreds of running nodes; their pulses must be pure CSS animations (driven by a class), not per-node JS `setInterval` updating styles. JS-driven pulses on 200 nodes would peg the main thread.

# Respecting OS Setting Discovery

The app reads the OS setting via the media query; it does not need a manual toggle mirroring it, but a manual "reduce motion" setting MAY override to always-on. The manual setting, if present, forces the same token re-point regardless of the media query.

```text
effective = manualReduceMotion ?? osPrefersReducedMotion
if effective: apply 0ms override
```

# AI Notes

Do not animate with JS timers for many elements. Use CSS animations (class-driven). Per-node `setInterval` pulses on a busy graph will freeze the UI.

Do not convey status by motion alone. When reduced motion stops the pulse, color must still say "running." A pulse that is the only running signal becomes invisible to reduced-motion users.

Do not use literals for durations. Use tokens so the override catches them. A literal `transition: 0.2s` plays even under reduced motion, violating accessibility.

Do not add a manual toggle that bypasses the token system. If a manual "reduce motion" exists, it forces the same `0ms` re-point — it does not invent a second mechanism.

# Related Documents

- [[07-ui-ux/README]]
- [[Animations-Part01]]
- [[Animations-Part02]]
- [[Animations-Part04]]
- [[Animations-Diagrams]]
- [[DesignTokens-Part05]]
- [[Accessibility-Part04]]
- [[Accessibility-Part06]]
- [[NodeGraph-Part07]]
- [[NodeGraph-Part08]]
- [[TerminalCards-Part05]]
