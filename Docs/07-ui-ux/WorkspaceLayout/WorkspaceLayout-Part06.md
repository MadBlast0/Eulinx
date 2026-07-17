---
title: WorkspaceLayout Specification - Part 06
status: draft
version: 1.0
tags:
  - ui-ux
  - workspace-layout
  - architecture
related:
  - "[[07-ui-ux/README]]"
  - "[[WorkspaceLayout-Part01]]"
  - "[[WorkspaceLayout-Part05]]"
  - "[[WorkspaceLayout-Diagrams]]"
  - "[[Accessibility-Part01]]"
  - "[[KeyboardShortcuts-Part01]]"
  - "[[ResponsiveRules-Part01]]"
---

# WorkspaceLayout Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, the Region Model, and the Object Model
Part 02 - The Window Shell, Tauri Window Configuration, and Mount Order
Part 03 - Resizable and Collapsible Panes, Constraints, and the Resize Algorithm
Part 04 - Layout Persistence, Migration, and the Workspace Binding
Part 05 - Multi-Tab and Multi-Workspace Handling
Part 06 - The Focus Model, Checklist, and Worked Examples
Diagrams - WorkspaceLayout-Diagrams.md

# Purpose of This Part

This closing part specifies the focus model — which region holds the keyboard, how focus moves, how it is painted, and what happens when a region is collapsed, unmounted, or destroyed. It also collects the full implementation checklist, three worked examples, and the future-expansion notes. Focus is Tier 3 ephemeral state: it is never persisted, and it is recomputed on every layout change rather than restored from disk.

# The Focus Model

Eulinx has exactly one focused region at any instant while the window itself is focused. Focus answers the question "where does a keystroke go?" and it is independent of which region is visible. A collapsed `inspector` cannot hold focus because it is not visible; the solver and the focus controller agree on this.

```text
focusedRegion ∈ { titleBar, sidebar, canvas, inspector, panel, statusBar }
focusedRegion.visible === true   ALWAYS
```

The six regions do not have equal focus standing. `titleBar` and `statusBar` are display surfaces; they accept focus only for their interactive controls (the window controls, the workspace crumb menu). They are not tab destinations in the normal sense. The tab ring moves between `sidebar`, `canvas`, `inspector`, and `panel` only. This is consistent with the surface registry in [[Accessibility-Part01]], which grants each of those four a single tab stop.

# Focus Entry Points

```text
sidebar     Tab from titleBar, or window focus, or explicit view.focusSidebar command
canvas      Tab/Arrow into the node graph, or the center tab strip
inspector   Tab from canvas, or a Worker selection that opens the inspector
panel       Tab from inspector, or the bottom panel tab strip
```

The canonical cycle is `sidebar -> canvas -> inspector -> panel -> sidebar`. `Shift+Tab` reverses it. The focus controller owns this cycle; no component decides its own next focus target. This is what lets [[KeyboardShortcuts-Part01]] bind `view.focusSidebar`, `view.focusGraph`, `view.focusInspector`, and `view.focusPanel` as plain commands without each surface knowing about the others.

# Focus Transitions

```text
idle                window not focused, no region focused
sidebar             window focused, first region to receive Tab
canvas              Tab from sidebar, or graph receives focus
inspector           Tab from canvas
panel               Tab from inspector
restoring           a previously focused region is collapsed/unmounted;
                    focus returns to the last valid visible region
```

Every transition is driven by the keyboard controller, never by a component mounting. When the user clicks a region, the focus controller is told the new target and updates `FocusState.focusedRegion`; `focusVisible` becomes `false` for pointer focus, `true` for keyboard focus, so the ring only paints on keyboard navigation per [[Accessibility-Part01]].

# Focus Loss Rules

These are the load-bearing rules. Violating any one produces a user who pressed Tab and landed on `document.body` with no visible focus anywhere.

```text
Rule 1  When a focused region is collapsed, focus moves to the next
        visible region in the cycle, never to document.body.

Rule 2  When a focused region is unmounted (panel closes, workspace
        switches), focus is restored to canvas by default, because
        canvas is always visible.

Rule 3  When the window loses focus and regains it, the previously
        focused region regains focus ONLY if it is still visible.
        If it was collapsed while unfocused, apply Rule 1.

Rule 4  A modal or overlay, when it closes, restores focus to
        previousRegion, which the controller captured on open.
        See [[KeyboardShortcuts-Part03]].

Rule 5  focusVisible resets to false on any pointer interaction and
        true on any keyboard navigation. The ring paint is a pure
        function of focusVisible, not of focusedRegion.
```

Rule 1 is the one implementers break: they collapse `inspector` and forget to move focus, so the next Tab does nothing because focus is on an invisible element. The controller MUST listen for the collapse effect and re-home focus in the same tick.

# The Focus Ring

The ring is painted by a token-driven CSS outline, not by a component. The exact token contract lives in [[Accessibility-Part03]]; WorkspaceLayout only guarantees that exactly one element carries `data-Eulinx-focus="true"` at a time and that it lives inside `focusedRegion`. The ring MUST NOT be painted when `focusVisible === false`. A mouse click that focuses the canvas must not show a ring, per the "Quiet by default" rule.

# The Implementation Checklist

This is the complete acceptance list for the shell. A build is not done until every box is satisfied.

```text
[ ] Exactly one AppShell mounts per Tauri window.
[ ] Regions render only the six RegionIds. No seventh region.
[ ] Every tenant receives its box via props; none measure the window.
[ ] canvas.size is derived by the solver; never stored, never read as truth.
[ ] The sum invariants hold on every resize, including DPI changes.
[ ] Min/max constraints clamp, never reject, a user resize.
[ ] Collapse is a solver op that reallocates pixels to canvas.
[ ] Layout persists per workspaceId, debounced at 400ms, single-flight.
[ ] Flush runs on drag end and on window close.
[ ] null stored layout means DEFAULT_LAYOUT, not an error.
[ ] Migration runs forward, never backward; missing step falls back.
[ ] Validation silently repairs; never rejects to the user.
[ ] Focus is never on an invisible region.
[ ] Switching workspaces swaps LayoutState atomically; no second root.
[ ] The pinned graph tab is never closeable, never recreated.
[ ] Tenants mount only after ready; never during loading.
[ ] MIN_WINDOW_SIZE is enforced by the Tauri config.
[ ] degraded window-too-small overlay shows when below minimum.
```

# Worked Example 1: Drag the sidebar below its minimum

User drags the sidebar handle left until the width passes `sidebar.minSize` minus `collapseThreshold`. The solver clamps `sidebar.size` to 180 and stops; it does not go negative. Because the sidebar is `rail`-collapsible, the drag continues past 180 and the controller collapses it to `railSize` 48, recording `restoreSize` first. The freed 132px returns to `canvas` in the same solver pass. The sum is preserved. Focus, which may have been in the sidebar's tree, moves to `canvas` per Rule 1. No event is emitted; layout is not runtime state.

# Worked Example 2: Monitor disconnect shrinks the window

A macOS display disconnect fires `Eulinx://window/resized` with a container below `MIN_WINDOW_SIZE`. The solver runs Part 03's `degradeAxis`. `sidebar` collapses to rail, then `inspector` and `panel` collapse to hidden, then `canvas` is allowed below its 480 floor only as the last resort. If even that leaves the window below minimum, the shell shows the window-too-small overlay and the regions are rendered at their floors. When the display returns, a second `Eulinx://window/resized` re-runs the solver and restores everything from `restoreSize` (re-clamped to the new container). This is the path [[ResponsiveRules-Part01]] calls into.

# Worked Example 3: Close the last panel tab, then the region

The user closes the last tab in the bottom `panel`. The panel group deletes itself in the same commit that empties it (Part 01 invariant). `panel` becomes invisible (`visible: false`). If `focusedRegion` was `panel`, Rule 2 moves focus to `canvas` in the same tick. The region's height returns to 0 and the freed pixels go to `canvas`. Reopening any panel tab (via command or tab strip) re-creates the group and the region animates back from 0 using a token duration. No layout is lost; the user's arrangement of other regions is untouched.

# Future Expansion (NOT v1)

```text
Docking model
  Today the six regions have fixed positions. A future version MAY
  allow sidebar/inspector/panel to dock to either edge or float.
  That is a new ADR, not an edit to this part. The solver's
  degradeAxis order would need revision, not deletion.

Per-pane split
  A future canvas MAY host two side-by-side graph tabs. The tab
  model in Part 05 already supports multiple graph tabs; the shell
  would only need a split container. Out of scope for v1.

Multi-window
  Explicitly rejected in Part 02. Exactly one window for the app's
  life. A second window would demand a second TauriWindowBridge and
  a second event stream, the double-listener hazard.
```

# AI Notes

Do not let a component own focus. Focus is a property of the shell, computed by the focus controller from the layout and the last interaction. A panel that calls `element.focus()` on mount without telling the controller leaves two regions believing they hold the keyboard.

Do not persist focus. It is Tier 3. A window that opens with focus inside a terminal because it was there three days ago eats the user's first keystrokes and is wrong. Compute focus on load from the cycle, defaulting to `sidebar`.

Do not paint the focus ring on mouse focus. `focusVisible` exists precisely so a click does not produce a blue halo. The ring is a keyboard affordance; showing it on pointer focus trains users to ignore it.

Do not collapse a region and leave focus inside it. This is the single most-reported shell bug in comparable apps. The collapse effect and the focus re-home MUST happen in the same tick, driven by the controller, never by two independent effects that race.

Do not make `titleBar` or `statusBar` tab stops. They are display surfaces with a few interactive controls. Giving them a slot in the Tab cycle adds two dead stops the user must press through to reach `canvas`. They participate in focus only through their own controls.

# Related Documents

- [[07-ui-ux/README]]
- [[WorkspaceLayout-Part01]]
- [[WorkspaceLayout-Part02]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part04]]
- [[WorkspaceLayout-Part05]]
- [[WorkspaceLayout-Diagrams]]
- [[ResponsiveRules-Part01]]
- [[Accessibility-Part01]]
- [[Accessibility-Part03]]
- [[KeyboardShortcuts-Part01]]
- [[KeyboardShortcuts-Part03]]
- [[Panels-Part01]]
- [[DesignTokens-Part01]]
- [[EventBus-Part01]]
