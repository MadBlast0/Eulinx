---
title: TerminalCards Specification - Part 03
status: draft
version: 1.0
tags:
  - ui-ux
  - terminal-cards
  - preview
related:
  - "[[07-ui-ux/README]]"
  - "[[TerminalCards-Part01]]"
  - "[[TerminalCards-Part02]]"
  - "[[TerminalCards-Diagrams]]"
  - "[[TerminalView-Part03]]"
---

# TerminalCards Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, Cards as Previews, Surface Registry
Part 02 - Card Model, Lifecycle, and the Preview Buffer
Part 03 - Card Layout, Grid, and Thumbnail Rendering
Part 04 - Card Interactions: Focus, Expand, and Dismiss
Part 05 - Card Status, Notifications, and the Badge System
Part 06 - Performance, Virtualization, and the Checklist
Diagrams - TerminalCards-Diagrams.md

# Purpose of This Part

TerminalCards are compressed previews of terminals shown in a card grid (distinct from the live TerminalView in [[TerminalView-Part01]]). This part specifies how cards are laid out in a responsive grid and how the thumbnail/preview of a terminal's content is rendered without running a second PTY. The card is a view of terminal truth, never a second source.

# The Card Grid

Cards live in a grid surface (typically a panel or a sidebar section). The grid is responsive per [[ResponsiveRules-Part02]] and uses token-driven gap and cell sizes.

```text
grid:               CSS grid, auto-fill minmax(token --card-min, 1fr)
gap:                token --card-gap
cell aspect:       token --card-aspect (default 16:10)
max cards shown:   12 in the grid; remainder in "more" overflow
```

The grid never scrolls the whole app; it scrolls within its own surface. Cards reflow on container resize via the responsive rules. The card order mirrors the tab `order` from [[TerminalView-Part03]] so the card grid and the tab strip agree.

# The Preview Render

A card shows a static snapshot of the terminal's last screen, not a live PTY. The snapshot is produced by the backend (a rendered frame of the PTY buffer) and sent once per quiet period, or the UI requests it via `invoke`.

```ts
interface CardPreview {
  terminalId: string;
  frame: string;        // rendered text/HTML snapshot or base64 image
  updatedAt: number;    // epoch ms, for staleness
}
```

```text
request:   invoke("Eulinx://terminal/preview", { terminalId })
push:      listen("Eulinx://terminal/preview", { terminalId, frame })
refresh:   debounced 2s after last output, or on card visible
```

The preview is a view of truth, not a live terminal. It does not accept keystrokes. A card that starts accepting input becomes a TerminalView, not a card. The boundary is intentional: cards are read-only glances.

# Thumbnail Content

The preview frame is rendered with the same token palette as the live terminal ([[TerminalView-Part04]]) but at a smaller font. ANSI colors are preserved; the cursor is not shown.

```text
font:        token --card-font-size (smaller than live terminal)
colors:      same 16-color ramp as TerminalView theme
truncation:  last N lines of the screen, bottom-aligned
overflow:    clipped, no scroll inside the card
```

If the backend sends an image frame, the card renders it with `object-fit: cover`. If it sends text, the card renders it in a non-interactive `<pre>` styled from tokens. Either way the content is backend-produced.

# Staleness Indicator

A card whose preview is older than a threshold shows a subtle "stale" marker. This tells the user the glance may not reflect the latest output without forcing a constant refresh (which would defeat the purpose of cards).

```text
stale if:    now - updatedAt > token --card-stale-ms (default 15000)
stale UI:    dimmed frame + small clock icon (token --card-stale)
refresh on:  card hovered/focused, or manual refresh action
```

The staleness is a view hint, Tier 3. It is never mirrored and never affects workflow truth.

# Card Sizing and Density

The user can choose card density (comfortable / compact). This changes `--card-min` and `--card-font-size` via a setting that flows through the theme token layer ([[DesignTokens-Part02]]).

```text
comfortable: --card-min 220px, --card-font-size 11px
compact:     --card-min 160px, --card-font-size 10px
```

The font size stays integer to avoid the blur problem from [[TerminalView-Part04]]. Density is a per-surface view preference, not workflow truth.

# AI Notes

Do not run a second PTY per card. Cards are snapshots, requested or pushed by the backend. A second PTY per card multiplies process count and breaks the "one PTY per tab" model in [[TerminalView-Part02]].

Do not let cards accept keystrokes. A card that takes input is a TerminalView. Mixing the two destroys the mental model and the focus rules.

Do not render previews from a UI-maintained buffer. The preview is backend-produced truth (a frame of the PTY). The UI renders it; it does not generate it.

Do not use fractional card font sizes. Keep them integer to match the live terminal's crispness rule. And do not refresh cards constantly — staleness is a feature, not a bug to erase.

# Related Documents

- [[07-ui-ux/README]]
- [[TerminalCards-Part01]]
- [[TerminalCards-Part02]]
- [[TerminalCards-Part04]]
- [[TerminalCards-Diagrams]]
- [[TerminalView-Part02]]
- [[TerminalView-Part03]]
- [[TerminalView-Part04]]
- [[ResponsiveRules-Part02]]
- [[DesignTokens-Part02]]
- [[EventBus-Part01]]
