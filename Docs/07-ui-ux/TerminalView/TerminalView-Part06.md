---
title: TerminalView Specification - Part 06
status: draft
version: 1.0
tags:
  - ui-ux
  - terminal-view
  - accessibility
related:
  - "[[07-ui-ux/README]]"
  - "[[TerminalView-Part05]]"
  - "[[TerminalView-Diagrams]]"
  - "[[Accessibility-Part01]]"
  - "[[KeyboardShortcuts-Part01]]"
---

# TerminalView Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, the Terminal as a Runtime Surface, Surface Registry
Part 02 - The PTY Bridge, the Two Channels, and the Data Contract
Part 03 - Tab Model, Tab Strip, and Lifecycle States
Part 04 - Rendering xterm.js, Themes, and the Grid
Part 05 - Search, Copy/Paste, and Selection
Part 06 - Accessibility, Focus, and the Implementation Checklist
Diagrams - TerminalView-Diagrams.md

# Purpose of This Part

This part specifies accessibility, focus handling, and the implementation checklist for the terminal surface. The terminal is the hardest surface to make accessible because its content is a live byte grid, not a DOM tree. The strategy: make the chrome (tabs, controls, search) fully accessible, expose the grid via an accessible description, and never trap keyboard focus.

# Focus Model

The terminal grid is a single focusable region. Inside it, keystrokes go to the PTY (Part 02); Tab is NOT a navigation key inside the grid — it is sent to the PTY. To leave the terminal, the user uses the global focus cycle ([[KeyboardShortcuts-Part01]]), which the shell handles, not xterm.

```text
grid focused:         all keys -> Eulinx://terminal/write (except global shortcuts)
leave grid:           global shortcut (e.g. Ctrl+1..9 or view.focusPanel)
tab strip:            separate focusable row, arrow-navigable
search box:           focusable input when open
```

The grid must set `tabindex="0"` and an `aria-label` describing it ("Terminal: bash, running"). It must not swallow the global shortcuts that move focus out — those are captured at the shell level before reaching xterm.

# Screen Reader Support

A raw xterm canvas is opaque to screen readers. Eulinx exposes a parallel accessible representation: the current line and a "copy last output" affordance, plus a live region announcing tab status changes.

```text
aria-label:           "Terminal {title}, {status}"
aria-live region:     announces "Terminal exited, code N", "Tab added"
sr-only last line:    updated on output pause (debounced) for review
```

Full screen-reader navigation of scrollback is out of scope for v1 (xterm's a11y addon is limited); the minimum bar is: the surface is labeled, status changes are announced, and the chrome is operable. This meets the "no dead ends" rule for the chrome.

# Contrast and Themes

The terminal palette (Part 04) must meet WCAG AA contrast against its background for the default themes. The 16-color ANSI ramp is chosen to satisfy this in both light and dark.

```text
terminal fg vs bg:    >= 4.5:1 (AA normal text)
bright colors:        used for emphasis only, still >= 3:1 vs bg
selection:            must remain readable (fg unchanged on selection)
```

User themes that drop below contrast are the user's choice, but the default light/dark themes ship compliant. See [[Accessibility-Part05]] for the contrast contract.

# Reduced Motion

The terminal has little motion, but the exit overlay fade and the search match pulse use tokens that respect `prefers-reduced-motion` ([[Animations-Part03]], [[Accessibility-Part04]]). No scrolling marquee, no animated cursor by default (the block cursor blink is OS-controlled and acceptable).

# The Implementation Checklist

```text
[ ] One xterm instance per tab, held in a ref, disposed on close.
[ ] PTY bytes routed strictly by terminalId.
[ ] Keystrokes passed through to Eulinx://terminal/write.
[ ] cols/rows derived from token cell metrics; resize debounced.
[ ] Theme mapped from tokens; follows app theme change.
[ ] Selection/copy read from xterm; paste writes to PTY.
[ ] Clear issued as runtime command, not UI wipe.
[ ] Tab strip navigable by keyboard; close is a separate control.
[ ] Grid has aria-label and tabindex; does not trap global shortcuts.
[ ] Status changes announced via aria-live.
[ ] Default palettes meet WCAG AA in light and dark.
[ ] prefers-reduced-motion honored on overlay/search animation.
```

# Known Limitations (v1)

```text
- Full scrollback screen-reader navigation not provided; only
  current-line review and status announcements. An xterm a11y
  improvement is a future ADR.
- Bracketed paste relies on PTY advertising it; if not, paste is
  sent raw (acceptable, matches most terminals).
```

# AI Notes

Do not let the grid trap Tab. Inside the terminal, Tab is a PTY key. But the global shortcuts that move focus OUT must still work — capture them at the shell before xterm sees them, or the user is stuck in the terminal with no keyboard escape.

Do not build a UI text buffer for screen readers. Expose an aria-live status and a debounced last-line snapshot; do not try to mirror scrollback into the DOM (it will desync from xterm).

Do not ship non-compliant default palettes. The terminal is text-dense; sub-AA contrast is unreadable. The default themes must pass.

Do not wipe the grid for Clear. Issue the runtime command. A UI wipe leaves PTY-held scrollback that reappears on the next output, looking like a ghost.

# Related Documents

- [[07-ui-ux/README]]
- [[TerminalView-Part01]]
- [[TerminalView-Part02]]
- [[TerminalView-Part03]]
- [[TerminalView-Part04]]
- [[TerminalView-Part05]]
- [[TerminalView-Diagrams]]
- [[Accessibility-Part01]]
- [[Accessibility-Part04]]
- [[Accessibility-Part05]]
- [[KeyboardShortcuts-Part01]]
- [[Themes-Part01]]
