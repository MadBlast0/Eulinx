---
title: TerminalView Specification - Part 02
status: draft
version: 1.0
tags:
  - ui-ux
  - terminal-view
  - pty
related:
  - "[[07-ui-ux/README]]"
  - "[[TerminalView-Part01]]"
  - "[[TerminalView-Diagrams]]"
  - "[[TerminalView-Part03]]"
  - "[[EventBus-Part01]]"
---

# TerminalView Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the Terminal as a Runtime Surface, Surface Registry
Part 02 - The PTY Bridge, the Two Channels, and the Data Contract
Part 03 - Tab Model, Tab Strip, and Lifecycle States
Part 04 - Rendering xterm.js, Themes, and the Grid
Part 05 - Search, Copy/Paste, and Selection
Part 06 - Accessibility, Focus, and the Implementation Checklist
Diagrams - TerminalView-Diagrams.md

# Purpose of This Part

This part specifies how the UI talks to the Rust PTY backend. The terminal is the strictest case of "UI renders backend truth": every byte on screen came from a PTY, and every key the user presses goes to a PTY. The UI never invents terminal content. The transport is Tauri IPC — `invoke` for commands, `listen` for the EventBus stream. That is the same two-channel rule as the rest of the app, applied to a byte stream.

# The PTY Bridge

A terminal tab is backed by a Rust-spawned PTY. The UI holds a `terminalId`; it does not hold the PTY process. All byte traffic flows over the two channels.

```text
UI -> Rust:   invoke("Eulinx://terminal/spawn",   { tabId, shell, cwd })
UI -> Rust:   invoke("Eulinx://terminal/write",   { terminalId, data })   // keystrokes
UI -> Rust:   invoke("Eulinx://terminal/resize",  { terminalId, cols, rows })
UI -> Rust:   invoke("Eulinx://terminal/kill",    { terminalId })

Rust -> UI:   listen("Eulinx://terminal/data",    { terminalId, bytes })  // PTY stdout/stderr
Rust -> UI:   listen("Eulinx://terminal/exit",    { terminalId, code })
Rust -> UI:   listen("Eulinx://terminal/title",   { terminalId, title })
```

The `Eulinx://` prefix marks a Tauri IPC channel, not a network URL. The UI never opens a raw socket to the PTY; Tauri mediates. This keeps the security boundary: the frontend cannot spawn arbitrary processes without going through the vetted `invoke` handlers.

# The Data Contract

PTY output arrives as raw bytes (UTF-8, with escape sequences). The UI feeds them to xterm.js, which interprets them into the grid. The UI does NOT parse ANSI itself for content; xterm.js owns the cell model.

```ts
interface TerminalDataEvent {
  terminalId: string;       // routes to the correct xterm instance
  bytes: string;            // base64 or binary string of PTY output
}

interface TerminalExitEvent {
  terminalId: string;
  code: number | null;      // null = killed by signal
}
```

Routing by `terminalId` is mandatory: a single EventBus topic carries all terminals' output, and the UI demultiplexes. A terminal that writes to the wrong xterm instance is a cross-talk bug that looks like corruption.

# Input Direction

Keystrokes go the other way: the UI captures them from xterm's `onData` and forwards via `invoke`. The UI does not interpret them beyond what xterm reports; it is a pass-through to the PTY.

```text
xterm.onData(key)  ->  invoke("Eulinx://terminal/write", { terminalId, data: key })
```

This is the inverse of the data channel. The UI is a transparent coupler: bytes in from PTY to screen, bytes out from keyboard to PTY. No terminal content is ever synthesized by the UI except the locally-rendered selection highlight and the prompt-independent chrome (tab title, close button).

# Resize Contract

When the terminal's grid cell changes size (font metrics × pixel box), the UI measures `cols × rows` and sends `Eulinx://terminal/resize`. The PTY must be told or line wrapping desyncs.

```text
on container resize:
  cols = floor(width  / cellWidth)
  rows = floor(height / cellHeight)
  if cols != lastCols || rows != lastRows:
      invoke("Eulinx://terminal/resize", { terminalId, cols, rows })
```

The resize is debounced (Part 04) to avoid a flood during a drag. The Rust side reconfigures the PTY winsize; xterm re-flows. The UI never assumes a resize succeeded — it waits for the next PTY output to confirm the new geometry took effect.

# Lifecycle and the Two Channels

```text
spawn -> (invoke)        Rust forks PTY, emits nothing yet
data  -> (listen)        PTY produces output, UI paints
title -> (listen)        shell reports cwd/title, UI updates tab
exit  -> (listen)        PTY closed, UI shows exit overlay
kill  -> (invoke)        UI requests termination
```

Note the asymmetry: start/stop/resize are `invoke` (commands), while output/title/exit are `listen` (events). This is the canonical two-channel split from [[07-ui-ux/README]]. The UI never "polls" the PTY for output; it listens.

# AI Notes

Do not let the UI parse ANSI to extract "content." xterm.js owns the cell grid. Parsing escape sequences in the UI duplicates xterm's job and diverges from it, producing wrong selections and wrong copy output.

Do not route PTY bytes by anything other than `terminalId`. Cross-talk between terminals is a silent corruption that users cannot diagnose. Demultiplex strictly.

Do not synthesize terminal output in the UI. A "welcome message" rendered as if it came from the PTY breaks the truth model and confuses copy/paste. Render UI chrome separately from the PTY grid.

Do not assume a resize took effect. Wait for PTY output to confirm. Assuming lets the UI and PTY disagree on geometry, and the next line wraps at the wrong column.

# Related Documents

- [[07-ui-ux/README]]
- [[TerminalView-Part01]]
- [[TerminalView-Part03]]
- [[TerminalView-Part04]]
- [[TerminalView-Diagrams]]
- [[EventBus-Part01]]
- [[TerminalCards-Part01]]
- [[Panels-Part01]]
