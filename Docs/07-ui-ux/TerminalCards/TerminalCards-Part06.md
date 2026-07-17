---
title: TerminalCards Specification - Part 06
status: draft
version: 1.0
tags:
  - ui-ux
  - terminal-cards
  - performance
related:
  - "[[07-ui-ux/README]]"
  - "[[TerminalCards-Part05]]"
  - "[[TerminalCards-Diagrams]]"
  - "[[Accessibility-Part01]]"
---

# TerminalCards Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, Cards as Previews, Surface Registry
Part 02 - Card Model, Lifecycle, and the Preview Buffer
Part 03 - Card Layout, Grid, and Thumbnail Rendering
Part 04 - Card Interactions: Focus, Expand, and Dismiss
Part 05 - Card Status, Notifications, and the Badge System
Part 06 - Performance, Virtualization, and the Checklist
Diagrams - TerminalCards-Diagrams.md

# Purpose of This Part

This part specifies the performance contract and the implementation checklist for TerminalCards. Cards exist to give a cheap glance at many terminals; if rendering them is as expensive as running them, the feature is pointless. The strategy: snapshots not live PTYs, metadata-only event subscriptions, and virtualization past the visible count.

# Performance Budget

```text
card grid idle CPU:   ~0 (no live PTYs, no byte subscription)
preview refresh:      debounced 2s after output, or on demand
grid render (12):     < 8ms on reference HW
event cost per card:  metadata only (exit/alert/title), not bytes
```

The budget is met by never subscribing cards to `Eulinx://terminal/data` bytes. They subscribe to the lightweight metadata events only (Part 05). The preview frame is pushed/pulled at most every 2s per terminal, not per output byte.

# Virtualization

When more than the visible card count exist, only the on-screen cards (plus a small buffer) are mounted. Off-screen cards are unmounted but their order/status stay in the mirror.

```text
visible window:    cards in grid viewport + 2 buffer rows
off-screen:        not mounted; mirror holds model; re-mount on scroll
max mounted:       token --card-virtual-max (default 24)
```

Virtualization is a render decision only. A card off-screen is still real, still dismissible, still in the tab order logically (roving tabindex skips unmounted ones but keeps position). This mirrors the culling rule in [[NodeGraph-Part08]].

# Preview Cache

Preview frames are cached by `terminalId` with a timestamp. A card reuses the cache until staleness (Part 03) or an explicit refresh.

```text
cache:        Map<terminalId, { frame, updatedAt }>
on mount:     if cache fresh (< stale-ms) use it; else request
on push:      update cache; notify subscribed card only
```

The cache prevents re-requesting a frame for a card that just scrolled back into view. Only the card currently needing the frame gets the push, not all cards.

# The Implementation Checklist

```text
[ ] Cards are read-only previews; never accept keystrokes.
[ ] Preview is backend-produced; no second PTY per card.
[ ] Card subscribes to metadata events only, not data bytes.
[ ] Status projected from Tier 1 tab lifecycle, not computed.
[ ] Dismiss is view state; close goes through Eulinx://terminal/close.
[ ] Expand hands off to TerminalView; does not go live in place.
[ ] Roving tabindex: grid is a single tab stop.
[ ] Virtualization active past visible window; model stays in mirror.
[ ] Preview cache keyed by terminalId with staleness.
[ ] Quiet mode hides alerts, never exit badges.
[ ] Density setting uses integer font sizes.
[ ] Grid responsive per ResponsiveRules-Part02.
```

# Known Limitations (v1)

```text
- Preview is a periodic snapshot, not a live thumbnail; rapid
  output may not appear in the card for up to 2s. Acceptable for
  a glance surface.
- Off-screen card statuses update in the mirror but are not painted
  until scrolled into view (virtualization). The badge count is
  still accurate on mount.
```

# AI Notes

Do not subscribe cards to PTY bytes. Metadata only. A card grid subscribed to every terminal's output byte stream will melt the EventBus and the main thread, exactly defeating the feature.

Do not render live terminals inside cards. That is TerminalView's job. Cards are cheap glances; making them live doubles PTY count and breaks focus.

Do not drop virtualization to "keep it simple." A grid of 50 cards each mounting a preview frame is the performance cliff. Virtualize; keep the model in the mirror so off-screen cards are still real.

Do not compute status in the card. Project from Tier 1. Independent status computation is a truth break and a maintenance trap when the lifecycle rules change.

# Related Documents

- [[07-ui-ux/README]]
- [[TerminalCards-Part01]]
- [[TerminalCards-Part02]]
- [[TerminalCards-Part03]]
- [[TerminalCards-Part04]]
- [[TerminalCards-Part05]]
- [[TerminalCards-Diagrams]]
- [[TerminalView-Part02]]
- [[TerminalView-Part03]]
- [[NodeGraph-Part08]]
- [[ResponsiveRules-Part02]]
- [[EventBus-Part01]]
- [[Accessibility-Part01]]
