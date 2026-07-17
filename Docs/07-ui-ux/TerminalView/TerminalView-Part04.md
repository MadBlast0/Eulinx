---
title: TerminalView Specification - Part 04
status: draft
version: 1.0
tags:
  - ui-ux
  - terminal-view
  - rendering
related:
  - "[[07-ui-ux/README]]"
  - "[[TerminalView-Part03]]"
  - "[[TerminalView-Part05]]"
  - "[[TerminalView-Diagrams]]"
  - "[[Themes-Part01]]"
  - "[[DesignTokens-Part03]]"
---

# TerminalView Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, the Terminal as a Runtime Surface, Surface Registry
Part 02 - The PTY Bridge, the Two Channels, and the Data Contract
Part 03 - Tab Model, Tab Strip, and Lifecycle States
Part 04 - Rendering xterm.js, Themes, and the Grid
Part 05 - Search, Copy/Paste, and Selection
Part 06 - Accessibility, Focus, and the Implementation Checklist
Diagrams - TerminalView-Diagrams.md

# Purpose of This Part

This part specifies how xterm.js is mounted, themed, and sized to the grid. The terminal grid is a fixed-cell display: every character occupies a cell of `cellWidth × cellHeight`. The UI measures the container, derives `cols × rows`, and tells both xterm and the PTY (Part 02). Theming comes from the design tokens, not from xterm's bundled themes.

# Mounting xterm.js

One `Terminal` instance per tab, created on spawn and destroyed on close. The instance is attached to a container `div` that the UI positions; xterm owns the `<canvas>` it draws into.

```text
on tab spawn:    term = new Terminal({...}); term.open(containerEl)
on data event:   term.write(bytes)
on term.onData:  invoke Eulinx://terminal/write { terminalId, data }
on close:        term.dispose(); containerEl cleared
```

The instance is held in a ref keyed by `terminalId`, never in React state (it is a mutable imperative object). Only its derived `cols/rows` and status live in the mirror/state.

# The Grid and Cell Metrics

```ts
interface CellMetrics {
  cellWidth: number;    // from font + letterSpacing token
  cellHeight: number;   // from font + lineHeight token
  cols: number;
  rows: number;
}
```

The grid is computed from the container size and the token-driven font metrics. xterm's `renderer` is configured with the same metrics so characters align to cells. Mismatched metrics produce overlapping glyphs — a classic xterm setup bug.

```text
cols = max(1, floor(containerWidth  / cellWidth))
rows = max(1, floor(containerHeight / cellHeight))
```

# Theme Mapping

xterm is themed by mapping design tokens to xterm's `Theme` object. The terminal must follow the active app theme ([[Themes-Part01]]) including light/dark and any user overrides.

```ts
const xtermTheme = {
  background:   token("--terminal-bg"),
  foreground:   token("--terminal-fg"),
  cursor:       token("--terminal-cursor"),
  selectionBackground: token("--terminal-selection"),
  black:   token("--terminal-black"),   // ... through white + brights
  // 16-Color ANSI palette mapped from token ramp
};
term.options.theme = xtermTheme;
```

When the app theme changes, the UI recomputes `xtermTheme` and assigns it; xterm repaints. The terminal never uses its own hardcoded palette — it is part of the design system.

# Resize and Debounce

On container resize (ResizeObserver), the UI recomputes `cols/rows`, updates xterm (`term.resize(cols, rows)`), and notifies the PTY (Part 02) — debounced.

```text
onResize:  compute cols/rows
           if changed: term.resize(cols, rows); debounce(150ms) -> invoke resize
```

The debounce prevents a resize storm during a drag from spamming the PTY with winsize changes. xterm resizes immediately (visual), the PTY catches up after the drag settles. The UI tolerates a brief geometry mismatch because PTY output re-confirms.

# Font and DPI

The terminal font is the monospace token from [[Typography-Part02]]. DPI scaling must keep cells integer-aligned to avoid blur.

```text
fontFamily:  token(--font-mono)
fontSize:    token(--terminal-font-size)  // px, integer
devicePixelRatio: handled by xterm canvas renderer automatically
```

Non-integer font sizes or fractional cell widths cause sub-pixel blur on the canvas. The UI rounds cell dimensions and lets the container absorb the remainder as padding.

# AI Notes

Do not put the xterm instance in React state. It is an imperative object; storing it in state invites re-creation on every render. Hold it in a ref keyed by id.

Do not hardcode the terminal palette. Map from tokens so the terminal follows the app theme. A terminal that stays dark in light mode is a visible design-system break.

Do not skip the resize debounce. A drag firing `Eulinx://terminal/resize` every pixel reconfigures the PTY continuously and can wedge it. Debounce, and resize xterm immediately for visuals.

Do not use fractional cell metrics. Round to integers. Fractional cells blur the canvas renderer and misalign glyphs, which users read as "the terminal looks broken."

# Related Documents

- [[07-ui-ux/README]]
- [[TerminalView-Part02]]
- [[TerminalView-Part03]]
- [[TerminalView-Part05]]
- [[TerminalView-Diagrams]]
- [[Themes-Part01]]
- [[Themes-Part02]]
- [[Typography-Part02]]
- [[DesignTokens-Part03]]
- [[Panels-Part01]]
