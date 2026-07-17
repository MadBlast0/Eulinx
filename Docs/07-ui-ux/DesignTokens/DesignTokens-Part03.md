---
title: DesignTokens Specification - Part 03
status: draft
version: 1.0
tags:
  - ui-ux
  - design-tokens
  - color
related:
  - "[[07-ui-ux/README]]"
  - "[[DesignTokens-Part02]]"
  - "[[DesignTokens-Part04]]"
  - "[[DesignTokens-Diagrams]]"
  - "[[Themes-Part02]]"
  - "[[Accessibility-Part05]]"
  - "[[TerminalView-Part04]]"
---

# DesignTokens Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, Tokens as the Single Source of Style
Part 02 - Spacing, Radius, and Layout Tokens
Part 03 - Color Tokens, the Status Ramp, and the Terminal Palette
Part 04 - Typography and Font Tokens
Part 05 - Motion, Shadow, and Z-Index Tokens
Part 06 - Naming, Migration, and the Implementation Checklist
Diagrams - DesignTokens-Diagrams.md

# Purpose of This Part

This part specifies the color tokens: the surface/foreground ramp, the accent, the semantic status colors, and the 16-color terminal palette. Color is the theme-differentiated group ([[Themes-Part02]]): light and dark differ here. All colors must meet the contrast floor in [[Accessibility-Part05]].

# Surface and Foreground Ramp

A layered ramp from canvas (deepest) to elevated surfaces. Components reference by semantic name, not by hex.

```text
--color-bg-canvas:      base app background
--color-bg-surface:     panels, cards
--color-bg-elevated:    popovers, menus, dialogs
--color-bg-inset:       inputs, code blocks (slightly recessed)
--color-fg-default:     primary text
--color-fg-muted:       secondary text
--color-fg-subtle:      tertiary / disabled text
--color-border:         default border
--color-border-strong:  emphasis border
```

```text
component rule:   background: var(--color-bg-surface);
                  color: var(--color-fg-default);
forbidden:        color: #e6edf3;  (hardcoded hex in component)
```

Foreground must contrast with its intended background: `fg-default` ≥ 4.5:1 on `bg-surface`; `fg-muted` ≥ 4.5:1 as well (it is still readable text, just lower emphasis).

# Accent

One accent color drives primary actions, focus rings, selection, and active states. A single accent keeps the UI coherent.

```text
--color-accent:         primary action / selection
--color-accent-fg:      text on accent (must contrast with accent)
--color-accent-muted:   hover/active tint of accent
```

`accent-fg` (text painted on an accent button) must meet 4.5:1 against `--color-accent`. A theme that picks a light accent must set a dark `accent-fg`.

# The Status Ramp

Semantic colors for node/terminal/card status ([[NodeGraph-Part07]], [[TerminalCards-Part05]]). These are the same names everywhere so a "running" node and a "running" card use one token.

```text
--color-status-idle:    neutral/muted
--color-status-queued:  accent-tinted
--color-status-running: blue/cyan (motion implied)
--color-status-success: green
--color-status-error:   red
--color-status-paused:  amber
--color-status-warn:    amber (alias of paused for warnings)
```

Each status color used as a text/icon on `bg-surface` meets 4.5:1; when used as a small dot, the shape + label carry meaning so color-alone is never the only signal ([[Accessibility-Part06]]).

# The Terminal Palette

The 16-color ANSI ramp used by the terminal ([[TerminalView-Part04]]). It maps to xterm's theme object. Both light and dark themes provide a full, contrast-checked ramp.

```text
--color-terminal-bg
--color-terminal-fg
--color-terminal-black   ... --color-terminal-white
--color-terminal-bright-black ... --color-terminal-bright-white
--color-terminal-cursor
--color-terminal-selection
```

```text
mapping:   xtermTheme.black = var(--color-terminal-black)
           xtermTheme.background = var(--color-terminal-bg)
```

The ramp is chosen so that on the default themes, standard terminal output (green prompts, blue paths) remains readable. A custom theme overrides these too ([[Themes-Part04]]).

# Selection and Focus

```text
--color-selection:        text selection highlight (app-wide)
--color-focus-ring:       keyboard focus ring (Accessibility-Part03)
```

The focus ring color is the accent or a dedicated high-visibility color. It must be visible on every surface, so it is often a brightened accent or a contrast-safe outline.

# AI Notes

Do not hardcode hex in components. Read color tokens. Hardcoded `#e6edf3` breaks every theme and the terminal recolor ([[Themes-Part03]]).

Do not introduce a second accent. One accent keeps coherence. A component that uses a "nice blue" for its button diverges from every other primary action.

Do not use color alone for status. Pair the status token with a shape/label/icon so color-blind users get the signal ([[Accessibility-Part06]]). A red dot with no other cue fails.

Do not skip contrast on `accent-fg`. Text on an accent button must read at 4.5:1. A light accent with white text is invisible.

# Related Documents

- [[07-ui-ux/README]]
- [[DesignTokens-Part01]]
- [[DesignTokens-Part02]]
- [[DesignTokens-Part04]]
- [[DesignTokens-Diagrams]]
- [[Themes-Part02]]
- [[Themes-Part04]]
- [[NodeGraph-Part07]]
- [[TerminalCards-Part05]]
- [[TerminalView-Part04]]
- [[Accessibility-Part03]]
- [[Accessibility-Part05]]
- [[Accessibility-Part06]]
