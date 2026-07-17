---
title: WorkspaceLayout Specification - Part 04
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
  - "[[WorkspaceLayout-Part05]]"
  - "[[Workspace-Part01]]"
---

# WorkspaceLayout Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, the Region Model, and the Object Model
Part 02 - The Window Shell, Tauri Window Configuration, and Mount Order
Part 03 - Resizable and Collapsible Panes, Constraints, and the Resize Algorithm
Part 04 - Layout Persistence, Migration, and the Workspace Binding
Part 05 - Multi-Tab and Multi-Workspace Handling
Part 06 - The Focus Model, Checklist, and Worked Examples
Diagrams - WorkspaceLayout-Diagrams.md

# Purpose of This Part

Layout is Tier 2 view state: it is the frontend's own property, persisted per workspace, and opaque to the backend. This part specifies the persist contract: what goes over the wire, the debounce, the single-flight rule, migration, reset, and the flush-before-close rule.

# What Is Persisted

Only `PersistedLayout` from Part 01 crosses the IPC boundary. The backend treats it as opaque bytes keyed by `workspaceId`. It never parses it.

```ts
type PersistedLayout = {
  schemaVersion: number;
  workspaceId: string;
  regions: Record<RegionId, RegionState>;
  canvasTabs: CanvasTabsState;
  lastWindowSize: { width: number; height: number };
  updatedAt: string;
};
```

`focus` is excluded by design (Part 01). `canvas.size` is excluded because it is derived. Anything not in this type MUST NOT be sent.

# The Commands

```ts
type LayoutCommands = {
  get_workspace_layout: (args: { workspaceId: string }) => Promise<PersistedLayout | null>;
  set_workspace_layout: (args: { layout: PersistedLayout }) => Promise<void>;
  reset_workspace_layout: (args: { workspaceId: string }) => Promise<PersistedLayout>;
};
```

`get_workspace_layout` returning `null` is the normal first-run path, NOT an error. It means "use `DEFAULT_LAYOUT`".

# The Debounce

Persistence is trailing-debounced at 400ms. Every layout mutation (resize drag end, collapse, tab change, region move) schedules a persist. Rapid mutations reschedule the timer; only the final state persists.

```ts
const PERSIST_DEBOUNCE_MS = 400;

let timer: number | null = null;
function schedulePersist(layout: PersistedLayout) {
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void invoke("set_workspace_layout", { layout });
  }, PERSIST_DEBOUNCE_MS);
}
```

# The Single-Flight Rule

A layout can change again while a previous persist is in flight. The store MUST queue, not cancel and not run concurrently.

```ts
let inflight: Promise<void> | null = null;
let pending: PersistedLayout | null = null;

async function flush(layout: PersistedLayout) {
  pending = layout;
  if (inflight !== null) return;           // already flushing the latest pending
  while (pending !== null) {
    const next = pending;
    pending = null;
    inflight = invoke("set_workspace_layout", { layout: next })
      .catch((e) => logLayoutError(e))
      .finally(() => { inflight = null; });
    await inflight;
  }
}
```

Cancelling the in-flight request would lose the most recent change. Running two concurrently would interleave writes and can persist a stale `updatedAt`. The single-flight queue preserves order and never drops the latest.

# Flush on Drag End and on Close

The 400ms debounce is too slow for two cases:

```text
1. Drag end: on splitter pointerup, force an immediate flush so a quit
   within the debounce window does not lose the resize.

2. Window close: the close button (Part 02) MUST await flush() before
   calling invoke("window_close"). A layout lost on quit is the worst
   persistence bug because the user never knows it happened.
```

# Migration

`schemaVersion` is a positive integer. On load, if the stored version is older than `LAYOUT_SCHEMA_VERSION`, the migration chain runs.

```text
migrate(stored):
  v = stored.schemaVersion
  while v < LAYOUT_SCHEMA_VERSION:
    v = v + 1
    stored = MIGRATIONS[v](stored)     // each migration is pure, returns new shape
    if MIGRATIONS[v] is missing:
       log("layout_migration_missing", v)
       return DEFAULT_LAYOUT            // give up cleanly; never throw
  return stored
```

Each migration is a pure function that knows how to reshape one version into the next. A missing migration is treated as corruption: fall back to `DEFAULT_LAYOUT`. Never throw during migration; a thrown error on startup blocks the whole window.

# Validation After Load

After migration (or after applying `DEFAULT_LAYOUT`), the blob is validated against the invariants in Part 01. Any failure triggers clamp-and-repair, which runs the solver once at the current container size. Validation MUST NOT reject the layout back to the user; it MUST silently repair.

```text
validate(layout, containerSize):
  if regions keys != 6: use DEFAULT_LAYOUT.regions
  for each sizable region:
     if not collapsed and not in [min,max]: clamp to nearest bound
  if canvas.size < canvasMin and container allows: re-solve
  if canvasTabs.activeTabId not in tabs: pick mruOrder[0]
  if focus.focusedRegion not visible: reset to "canvas"
```

# Reset

`reset_workspace_layout` returns a fresh `DEFAULT_LAYOUT` for the current `workspaceId` and persists it immediately. The reset control MUST be reachable without any stored layout being readable (Part 01 MUST).

# Rules

WorkspaceLayout persistence MUST:

- persist only `PersistedLayout`, never the full `LayoutState`
- treat `null` from `get_workspace_layout` as `DEFAULT_LAYOUT`
- debounce at 400ms trailing
- single-flight the in-flight write
- flush immediately on drag end and on window close
- migrate forward through the chain, never backward
- fall back to `DEFAULT_LAYOUT` on any migration or validation failure
- never throw during load

WorkspaceLayout persistence MUST NOT:

- persist on every mousemove
- store `focus`, `canvas.size`, or any Tier 3 state
- run two `set_workspace_layout` calls concurrently
- interpret the blob on the backend
- reject a layout the user must then dismiss a dialog for

# AI Notes

Do not `await` the debounced persist on every resize frame. Awaiting blocks the drag handler and stutters the drag. Schedule-and-forget; await only on close.

Do not store layout in localStorage. It is per-workspace and belongs with the workspace data in SQLite, keyed by `workspaceId`. localStorage cannot be shared across the backend's multiple windows and cannot be queried by `get_workspace_layout`.

Do not treat `updatedAt` as a lock. It is informational. Two windows editing the same workspace will race; the last write wins and that is acceptable for view state. Do not build a CRDT for pane widths.

Do not skip the flush-before-close. The debounce exists to avoid disk churn during interaction, not to defer correctness. Close is the one moment correctness matters most.

# Related Documents

- [[07-ui-ux/README]]
- [[WorkspaceLayout-Part01]]
- [[WorkspaceLayout-Part02]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part05]]
- [[WorkspaceLayout-Part06]]
- [[WorkspaceLayout-Diagrams]]
- [[Workspace-Part01]]
- [[ResponsiveRules-Part01]]
- [[EventBus-Part01]]
- [[DesignTokens-Part01]]
