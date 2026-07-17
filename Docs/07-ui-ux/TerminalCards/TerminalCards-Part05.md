---
title: TerminalCards Specification - Part 05
status: draft
version: 1.0
tags:
  - ui-ux
  - terminal-cards
  - status
related:
  - "[[07-ui-ux/README]]"
  - "[[TerminalCards-Part04]]"
  - "[[TerminalCards-Part06]]"
  - "[[TerminalCards-Diagrams]]"
  - "[[TerminalView-Part03]]"
---

# TerminalCards Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, Cards as Previews, Surface Registry
Part 02 - Card Model, Lifecycle, and the Preview Buffer
Part 03 - Card Layout, Grid, and Thumbnail Rendering
Part 04 - Card Interactions: Focus, Expand, and Dismiss
Part 05 - Card Status, Notifications, and the Badge System
Part 06 - Performance, Virtualization, and the Checklist
Diagrams - TerminalCards-Diagrams.md

# Purpose of This Part

This part specifies how a card communicates terminal status and notifications. Because cards are previews, their value is in telling the user "something happened here" at a glance — without opening the terminal. The status is projected from the same Tier 1 tab state as [[TerminalView-Part03]]; cards never compute their own status.

# Status Projection

A card's status dot mirrors the terminal tab's lifecycle state. It is not a separate signal.

```text
running:    token --status-running, steady dot
exited:     token --status-error, solid dot + code badge
idle:       token --status-idle, dim dot (no recent output)
busy:       token --status-busy, pulse (output in last 2s)
```

`idle` vs `busy` is derived from the last-output timestamp (a view hint, Tier 3), not from a runtime "busy" flag — the PTY cannot know if the user is "busy." The dot color always comes from the lifecycle state first; the pulse is an added view signal on top.

# The Badge System

Badges are small overlays on the card corner that summarize pending attention. They are driven by notification events, not by the UI guessing.

```text
exit badge:        "code N" pill, red, until card expanded/acknowledged
alert badge:       from Eulinx://terminal/alert { terminalId, level }
count badge:       unread output lines since last view (view hint)
```

The "unread count" is a view hint computed from output events while the terminal was not the active surface. It is Tier 3 and resets when the terminal becomes active. It never affects workflow truth and is not persisted across sessions unless the user opts in.

# Notification Events

```text
Eulinx://terminal/exit    -> mark card exited, show exit badge
Eulinx://terminal/alert   -> show alert badge (level: info|warn|error)
Eulinx://terminal/title   -> update card title
Eulinx://terminal/data    -> if terminal not active, increment unread (view only)
```

These are the same EventBus events the live view consumes ([[EventBus-Part01]]). The card surface subscribes to a filtered subset; it does not need the raw bytes, only the metadata. This keeps card rendering cheap.

# Acknowledgement

A badge clears when its condition no longer holds or when the user acknowledges it.

```text
exit badge:     clears on expand (terminal shown) or explicit dismiss
alert badge:    clears on expand, or alert.autoClear after token --badge-ttl
unread badge:   resets to 0 when terminal becomes the active surface
```

Acknowledgement is a view action (Tier 2/3). It does not tell the runtime anything — the runtime already knows the terminal exited; the badge is purely the user's "I saw it" marker.

# Quiet and Do-Not-Disturb

A surface-level "quiet" toggle suppresses alert badges (but not exit badges, which are truth). This is a view preference per surface.

```text
quiet on:    alert badges hidden; exit + unread still shown
quiet off:   all badges shown
```

Exit badges are never suppressed because a terminated process is workflow-relevant truth, not a notification. Suppressing them would hide a real failure.

# AI Notes

Do not compute card status independently of the tab lifecycle. Project it from the same Tier 1 state the live view uses. A card that shows "running" while the terminal is exited is a truth break the user will catch.

Do not make unread counts workflow truth. They are view hints that reset when the terminal is active. Persisting them as if they mattered would confuse "I read it" vs "it happened."

Do not suppress exit badges in quiet mode. A terminated PTY is truth, not noise. Quiet mode may hide alerts, never exit states.

Do not have the card subscribe to raw PTY bytes. It needs metadata only. Subscribing to the byte stream for a preview grid multiplies EventBus traffic and defeats the card's performance purpose (Part 06).

# Related Documents

- [[07-ui-ux/README]]
- [[TerminalCards-Part01]]
- [[TerminalCards-Part02]]
- [[TerminalCards-Part03]]
- [[TerminalCards-Part04]]
- [[TerminalCards-Part06]]
- [[TerminalCards-Diagrams]]
- [[TerminalView-Part02]]
- [[TerminalView-Part03]]
- [[EventBus-Part01]]
- [[DesignTokens-Part03]]
