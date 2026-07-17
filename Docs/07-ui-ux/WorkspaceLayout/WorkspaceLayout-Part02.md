---
title: WorkspaceLayout Specification - Part 02
status: draft
version: 1.0
tags:
  - ui-ux
  - workspace-layout
  - architecture
related:
  - "[[07-ui-ux/README]]"
  - "[[WorkspaceLayout-Part01]]"
  - "[[WorkspaceLayout-Part03]]"
  - "[[WorkspaceLayout-Diagrams]]"
  - "[[TauriWindowConfig-Part01]]"
  - "[[Panels-Part01]]"
---

# WorkspaceLayout Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the Region Model, and the Object Model
Part 02 - The Window Shell, Tauri Window Configuration, and Mount Order
Part 03 - Resizable and Collapsible Panes, Constraints, and the Resize Algorithm
Part 04 - Layout Persistence, Migration, and the Workspace Binding
Part 05 - Multi-Tab and Multi-Workspace Handling
Part 06 - The Focus Model, Checklist, and Worked Examples
Diagrams - WorkspaceLayout-Diagrams.md

# Purpose of This Part

This part specifies the outermost artifact: the Tauri v2 window and the `AppShell` component that mounts inside it. Everything in Part 01 is inert until `AppShell` exists and mounts tenants in the correct order against a known container size.

The governing rule from [[07-ui-ux/README]]: the UI never invents truth, and the shell never invents geometry. The Tauri window config is the only place a hard pixel number is allowed to originate from the platform; everything downstream derives from it.

# The Tauri Window Configuration

The window is created once, at startup, by the Rust bootstrap. The frontend MUST NOT create, destroy, or resize the window directly except through `invoke("window_set_size", ...)` and `invoke("window_set_state", ...)`.

```json
{
  "title": "Eulinx",
  "width": 1440,
  "height": 900,
  "minWidth": 940,
  "minHeight": 560,
  "decorations": false,
  "transparent": false,
  "resizable": true,
  "fullscreen": false,
  "center": true,
  "theme": "Dark"
}
```

`decorations: false` is mandatory. Eulinx draws its own `titleBar` region (Part 01 wireframe) and handles window drag, minimize, maximize, and close itself, because the custom title bar is a layout region that the solver owns. A native title bar would subtract pixels the solver does not know about and break the sum invariant.

```text
Rule: the native frame MUST be removed. The Eulinx titleBar region replaces it.
The platform border is 0px. The min size in the config equals
MIN_WINDOW_SIZE from Part 01, NOT a separate value.
```

# The Window Shell Component Tree

```text
<EulinxRoot>                         owns the Tauri event bridge, mounts once
  |
  +-- <TauriWindowBridge>          registers global listeners, no DOM
  |
  +-- <AppShell>                  THE shell. Renders the six regions.
        |
        +-- <TitleBar region="titleBar">
        |     +-- <WindowControls>   minimize/maximize/close
        |     +-- <WorkspaceCrumb>   workspace + session name
        |     +-- <DragRegion>       pointerdown -> window.start_dragging
        |
        +-- <Sidebar region="sidebar">        sees its box via props
        +-- <Canvas region="canvas">          the flex region
        |     +-- <CanvasTabStrip>
        |     +-- <ActiveTabHost>             mounts the active tab content
        |
        +-- <Inspector region="inspector">
        +-- <Panel region="panel">
        +-- <StatusBar region="statusBar">
```

`AppShell` receives exactly one prop: `layout: LayoutState`. It does not read geometry from anywhere else. Each region component receives its own `RegionState` derived from `layout.regions[id]` and the computed `canvas` size. No region ever calls `window.innerWidth`.

# Mount Order

Mount order is fixed. Tenants MUST NOT mount before the shell is in `ready` (Part 01 lifecycle).

```text
1. EulinxRoot
2. TauriWindowBridge        (subscribes to Eulinx://* ; pairs every listen with unlisten)
3. AppShell                 (renders the six region containers at default sizes)
4. Solver pass #1           (computes real sizes from container size + constraints)
5. TitleBar, StatusBar      (always present, mount immediately)
6. Sidebar                  (mounts against its box)
7. Inspector, Panel         (mount collapsed=false default; mount against boxes)
8. CanvasTabStrip          (reads canvasTabs from layout)
9. ActiveTabHost           (mounts the active tab's content LAST)
10. Run solver pass #2      (now that real content sizes exist, re-clamp)
```

The reason the active tab mounts last is the bug described in Part 01: a NodeGraph that mounts into a zero-size box initializes its viewport against zero and never recovers. `ActiveTabHost` is gated behind a `useEffect` that waits for the container's measured `clientWidth` to be non-zero (measured once, by `AppShell`, not by the tenant) before flipping a `mountChildren` flag.

# The Drag Region

The `titleBar` is the only valid window-drag surface. A pointerdown on a non-interactive part of the title bar calls `invoke("window_start_drag")`. Interactive controls (`WindowControls`, `WorkspaceCrumb` when a menu is open) stop propagation so a click does not start a drag.

```ts
function onTitlePointerDown(e: React.PointerEvent) {
  // Only the left button, only on the chrome (not on a button).
  if (e.button !== 0) return;
  if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
  invoke("window_start_drag");
}
```

# The Custom Close Path

Because `decorations` is false, the close button is a UI control, not a platform one. Clicking it MUST call `invoke("window_close")` after the layout flush completes, so the final layout is never lost. A window that closes before its debounced layout save loses the user's arrangement. See Part 04 for the flush-before-close rule.

# Window State Events

The shell subscribes to exactly two window-lifecycle channels. These are the only platform signals the shell listens for.

```ts
type WindowChannels = {
  "Eulinx://window/resized": { width: number; height: number; reason: "user" | "os" | "restore" };
  "Eulinx://window/dpi_changed": { scaleFactor: number; reason: "monitor" | "os" };
};
```

On `Eulinx://window/resized` the shell runs the solver with the new container size. On `Eulinx://window/dpi_changed` it re-runs the solver because DPI changes alter the mapping between CSS px and device px, and a region sized in CSS px must be re-clamped. See [[ResponsiveRules-Part01]] for the degradation that fires when the new size violates `MIN_WINDOW_SIZE`.

# AI Notes

Do not recreate the Tauri window on a workspace switch. There is exactly one window for the app's life. Switching workspaces swaps layout blobs inside the one `AppShell`, per Part 05. An implementer who mounts a second `EulinxRoot` on workspace switch gets two event bridges and double-applied events.

Do not let the title bar's drag handler fire on a button. A close button that also starts a drag feels broken and, on some platforms, swallows the click. Use `data-no-drag` and a closest check.

Do not measure the container with a `ResizeObserver` inside `AppShell` and push the result back into React state on every frame. The solver runs on explicit window events and explicit user gestures. A `ResizeObserver` that fires during a CSS transition will feed fractional sizes to the solver mid-animation and make panes jitter.

Do not hide the native frame and then forget to implement the window controls. With `decorations: false`, minimize/maximize/close are your code. Omitting them strands the user.

# Related Documents

- [[07-ui-ux/README]]
- [[WorkspaceLayout-Part01]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part04]]
- [[WorkspaceLayout-Part05]]
- [[WorkspaceLayout-Part06]]
- [[WorkspaceLayout-Diagrams]]
- [[Panels-Part01]]
- [[Sidebar-Part01]]
- [[NodeGraph-Part01]]
- [[TerminalView-Part01]]
- [[ResponsiveRules-Part01]]
- [[TauriWindowConfig-Part01]]
- [[EventBus-Part01]]
- [[DesignTokens-Part01]]
