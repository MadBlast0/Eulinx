---
title: WorkspaceLayout Specification - Part 05
status: draft
version: 1.0
tags:
  - ui-ux
  - workspace-layout
  - architecture
related:
  - "[[07-ui-ux/README]]"
  - "[[WorkspaceLayout-Part01]]"
  - "[[WorkspaceLayout-Part04]]"
  - "[[WorkspaceLayout-Part06]]"
  - "[[Workspace-Part01]]"
  - "[[NodeGraph-Part01]]"
  - "[[TerminalView-Part01]]"
---

# WorkspaceLayout Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, the Region Model, and the Object Model
Part 02 - The Window Shell, Tauri Window Configuration, and Mount Order
Part 03 - Resizable and Collapsible Panes, Constraints, and the Resize Algorithm
Part 04 - Layout Persistence, Migration, and the Workspace Binding
Part 05 - Multi-Tab and Multi-Workspace Handling
Part 06 - The Focus Model, Checklist, and Worked Examples
Diagrams - WorkspaceLayout-Diagrams.md

# Purpose of This Part

The `canvas` region hosts a tab strip. Eulinx runs one graph run at a time per workspace but may open many terminals and artifact diffs as tabs. This part specifies tab lifecycle, the pinned graph tab, MRU order, and the workspace-switch layout swap.

# The Canvas Tab Strip

The tab strip is mounted inside `CanvasTabStrip` (Part 02). It renders `canvasTabs.tabs` and highlights `activeTabId`.

```text
[ Graph* ] [ w_7a ] [ w_9c ] [ diff:auth.patch ] [ + ]
 ^pinned    terminal  terminal  artifact_diff    new tab
```

The pinned graph tab is created automatically on workspace activation and can never be closed. Its `pinned` flag is `true` and the close affordance is suppressed.

# Tab Lifecycle

```text
openTab(kind, subjectId, title):
  tab = { tabId, kind, title, subjectId, pinned:false, viewState:{} }
  tabs.push(tab)
  mruOrder.unshift(tab.tabId)
  activeTabId = tab.tabId

closeTab(tabId):
  if tabs[byId].pinned: return              // never close the graph tab
  tabs = tabs.filter(t => t.tabId !== tabId)
  mruOrder = mruOrder.filter(id => id !== tabId)
  if activeTabId == tabId:
     activeTabId = mruOrder[0] ?? graphTabId   // MRU, or fall back to graph
  persistCanvasTabs()
```

Opening a terminal tab: when the user double-clicks a Worker in the Sidebar, or when a Worker reaches `running` and no terminal tab for it exists yet (config-driven auto-open, OFF by default), a terminal tab is opened with `subjectId = workerId` and `kind = "terminal"`. See [[TerminalView-Part01]].

# Per-Tab View State

`viewState` is opaque Tier 2 state owned by the tenant. The shell persists it with the layout but never reads it. Examples:

```text
graph tab:        { viewport: {x,y,zoom}, selectedNodeIds: string[] }
terminal tab:     { scrollbackTop: boolean, searchOpen: boolean }
artifact_diff:    { sideBySide: boolean, showWhitespace: boolean }
```

The shell MUST NOT interpret `viewState`. A graph tab whose `viewState` is corrupt renders a default viewport rather than failing. See the validate step in Part 04.

# Multi-Workspace Handling

Eulinx supports multiple workspaces. Exactly one is active. Switching workspaces swaps the entire `LayoutState` for that workspace.

```text
switchWorkspace(targetId):
  // 1. Flush the current layout NOW (Part 04 single-flight).
  await flush(currentLayout)

  // 2. Set shell state to "swapping". Tenants unmount.
  setState("swapping")

  // 3. Load target layout, migrate, validate, hydrate.
  const blob = await invoke("get_workspace_layout", { workspaceId: targetId })
  const layout = hydrate(blob, containerSize)

  // 4. Swap the store's LayoutState in one assignment.
  layoutStore.set(layout)

  // 5. Re-run solver, recompute focus, mount tenants.
  setState("ready")
```

The swap is atomic at step 4. There is no frame where half the old workspace and half the new are mounted. That would briefly show the new graph against the old sidebar selection, which is a supervision hazard.

# Why One Window

There is exactly one Tauri window for the app's lifetime. Multiple workspaces are NOT multiple windows. A second window would require a second `TauriWindowBridge`, a second set of `Eulinx://` listeners, and a second event stream to reconcile. Eulinx deliberately avoids that. Switching workspaces is a layout swap inside one window. See Part 02.

# Rules

WorkspaceLayout tab handling MUST:

- create exactly one pinned graph tab per workspace, never deletable
- close a tab by removing it from both `tabs` and `mruOrder`
- after a close, set `activeTabId` to the MRU survivor or the graph tab
- persist `canvasTabs` as part of `PersistedLayout`
- flush before a workspace switch
- swap `LayoutState` atomically
- treat corrupt per-tab `viewState` as a default, never an error

WorkspaceLayout tab handling MUST NOT:

- allow the pinned graph tab to be closed
- leave `activeTabId` pointing at a closed tab
- mount new-workspace tenants before the layout swap completes
- hold two `LayoutState` objects in the store at once

# AI Notes

Do not let terminal tabs auto-open by default when a Worker starts. A run that spawns eleven Workers would explode the tab strip and shove the graph tab off-screen. Auto-open is OFF; the user opens a terminal deliberately, or uses TerminalCards ([[TerminalCards-Part01]]). A Worker's output is visible on its card without a tab.

Do not close the graph tab on workspace switch and recreate it. The pinned tab is a stable identity across switches; recreating it loses the graph's `viewState` (viewport, selection).

Do not merge the sidebar's selected Worker with the active terminal tab. They are independent: the user may be inspecting Worker A in the inspector while a terminal tab for Worker B is open. Binding them was tried and produced a UI where opening any terminal stole the selection.

Do not swap workspaces by unmounting then remounting the whole `EulinxRoot`. That tears down and rebuilds the event bridge, which is exactly the double-listener hazard from [[07-ui-ux/README]]. Swap `LayoutState` inside the one root.

# Related Documents

- [[07-ui-ux/README]]
- [[WorkspaceLayout-Part01]]
- [[WorkspaceLayout-Part02]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part04]]
- [[WorkspaceLayout-Part06]]
- [[WorkspaceLayout-Diagrams]]
- [[Workspace-Part01]]
- [[NodeGraph-Part01]]
- [[TerminalView-Part01]]
- [[TerminalCards-Part01]]
- [[Sidebar-Part01]]
- [[EventBus-Part01]]
- [[DesignTokens-Part01]]
