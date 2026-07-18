# Panels

The dockable-surface container system for Eulinx. WorkspaceLayout draws the
region boxes; **Panels fills them** — registration, mounting, tabs, dock
regions, lifecycle, and persistence.

Spec: `Docs/07-ui-ux/Panels/Panels-Part01..06.md`.

## Quick start

```tsx
import { WorkspaceLayout, PanelSlot } from "@/ui/layout"
import { PanelProvider, PanelHost, usePanels } from "@/ui/panels"

function App() {
  return (
    <PanelProvider workspaceId="ws_default">
      <WorkspaceLayout>
        {/* WorkspaceLayout owns the region frame; drop a PanelHost into its slot */}
        <PanelSlot>
          <PanelHost region="bottom" />
        </PanelSlot>
      </WorkspaceLayout>
    </PanelProvider>
  )
}
```

`PanelHost` can also render the `left` / `right` regions:

```tsx
<PanelHost region="right" />
<PanelHost region="left" emptyState={<span>No tools open</span>} />
```

## Public API

### Components

| Export | Purpose |
| --- | --- |
| `PanelProvider` | App-root provider. Owns the runtime model, hydration from the store, debounced persistence, and the idle-unmount timer. Props: `workspaceId`, `registry?`, `unmountAfterMs?`, `disablePersistence?`. |
| `PanelHost` | Renders every open panel group for a `region` (`"left" \| "right" \| "bottom" \| "center"`, default `"bottom"`) as tab groups. Drop into a WorkspaceLayout region. |
| `PanelTabGroup` | One group's tab strip + active body. Used internally by `PanelHost`; exported for custom layouts. |
| `PanelMountGate` | Implements `PANEL_LAZY_MOUNT`: renders `null` until first activation, then the descriptor's lazy component (wrapped in `Suspense` + error boundary). |
| `PanelErrorBoundary` | Catches a render crash, writes `PanelErrorState { kind: "render_crashed" }`, renders the error state. One broken panel never blanks the app. |

### Hook — `usePanels()`

```ts
const panels = usePanels()
panels.open(kind, options?)      // open (singletons focus the existing one) -> instanceId
panels.close(instanceId)         // no-op for non-closable descriptors (e.g. permissions)
panels.toggle(kind, options?)    // open/close (or focus a pinned singleton)
panels.focus(instanceId)         // make the active tab of its group
panels.setActive(groupId, id)    // switch active tab
panels.reorder(groupId, from, to)
panels.minimize(id) / restore(id)
panels.maximize(id) / unmaximize(id)
panels.setViewState(id, state) / setError(id, err)
panels.list(region?)             // open instances (group-ordered)
panels.groupsIn(region)          // groups in a region
panels.state                     // the raw PanelsState
panels.registry                  // the active PanelRegistry
```

`OpenPanelOptions`: `{ args?, region?, groupId?, lifecycle?, focus? }`.

### Registration API — for other surfaces

Sidebar, NodeGraph, and Terminal register their own panel kinds **before** the
app freezes the registry:

```ts
import { registerPanelKind, PANEL_REGISTRY } from "@/ui/panels"
import { lazy } from "react"

registerPanelKind({
  kind: "terminal-tabs",
  title: "Terminals",
  icon: "domain.terminal",            // an icon-registry key
  defaultRegion: "bottom",
  singleton: true,
  minWidthToken: "calc(var(--Eulinx-space-16) * 4)",
  minHeightToken: "calc(var(--Eulinx-space-16) * 3)",
  maxWidthToken: null,
  component: lazy(() => import("./terminal-panel")),  // lazy = expensive to mount
  dataSource: {
    commands: ["worker_output_tail"],  // MUST be in the IPC allowlist
    events: ["Eulinx://worker.output_appended"],  // MUST start with "Eulinx://"
    pollIntervalMs: null,
  },
  closable: true,
  reorderable: true,
  defaultOpen: false,
  keepAlive: true,                    // keep mounted (hidden) across tab switches
  lifecycle: {                        // optional callbacks — views only, never mutate trusted state
    onMount: (ctx) => {/* subscribe */},
    onUnmount: (ctx) => {/* teardown */},
    onShow: (ctx) => {/* resume */},
    onHide: (ctx) => {/* pause non-essential work */},
  },
})

// After all surfaces have registered:
PANEL_REGISTRY.freeze()
```

`registerPanelKind` throws a `PanelRegistryError` on a duplicate kind
(`kind: "duplicate_kind"`), a frozen registry (`"registry_frozen"`), or an
invalid descriptor (`"invalid_descriptor"` — empty title, a command outside the
IPC allowlist, or an event not prefixed with `Eulinx://`).

### Keyboard

`installPanelKeymap()` registers the `panel.*` commands + default bindings into
the shared `KeymapRegistry` (does not collide with the existing
`view.togglePanel` / `view.cyclePanel` / `app.closeTab`). Wire real behavior via
`registerCommandHandler("panel.openInspector", fn)` from `@/ui/keyboard`.

## The ten built-in kinds

Registered eagerly at module load in normative order (Part 02):

`inspector`, `artifacts`, `diff`, `memory`, `logs`, `events`, `metrics`,
`permissions`, `problems`, `search`.

Only `inspector` and `permissions` open by default (`DEFAULT_OPEN_KINDS`).
`permissions` is **not** closable and `diff` docks to `center`.

## Lifecycle & lazy mounting

```
opened  ->  (first activation)  mounted -> active
active  ->  (tab switched)      idle_hidden   (component stays mounted)
idle_hidden -> (unmountAfterMs) unmounted     (viewState preserved)
unmounted -> (activated)        mounted -> active
any     -> close                closed        (viewState discarded)
```

- **Lazy:** only the active tab's component mounts. Hidden `keepAlive` tabs stay
  mounted but hidden (`display:none`); other hidden tabs unmount after the idle
  timer (`PANEL_UNMOUNT_AFTER_MS`, default 300 000 ms).
- **State preserved:** unmount destroys the DOM, never the instance. `viewState`
  survives via the model and the persist blob.
- **Never unmount an active panel** (enforced in the reducer).

## Persistence

`panel-store-adapter.ts` mirrors `theme-loader` / `layout-store-adapter`:
`@tauri-apps/plugin-store` with a `localStorage` fallback, a versioned blob
(`PANEL_SCHEMA_VERSION`), forward-only `migrate()` that never throws, silent
`validateAndRepair()` (drops unknown kinds, enforces singletons, renormalizes
each region's `sizeFraction` sum to 1.0), debounced (400 ms) + single-flight
`flush`. Only Tier 1 arrangement + Tier 2 view state persist — **never fetched
data**.

## Tokens & motion

Every color / space / radius / border / z / opacity value is a `var(--Eulinx-*)`
token — no raw hex/rgb/px. Group entry uses the `panel.open` animation via
`useAnimation`, which honors `prefers-reduced-motion` automatically (instant
swap to the end state).
