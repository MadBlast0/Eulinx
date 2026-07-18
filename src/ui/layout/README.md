# `src/ui/layout` — WorkspaceLayout Shell

The composable shell for Eulinx. Six-region grid (titleBar, sidebar, canvas,
panel, inspector, statusBar) driven by a pure solver, with Tauri window chrome,
draggable splitters, a canvas tab strip, keyboard command registration, and
persistent layout state.

## Public API (barrel: `index.ts`)

Shell + context:

- `WorkspaceLayout` — top-level shell. Render inside a `ThemeProvider`.
- `WorkspaceLayoutProvider` — owns hydration, persistence, responsive collapse,
  focus sync, and live-region announcements. `WorkspaceLayout` renders it for you.
- `useWorkspaceLayout()` — access the live layout context (regions, focus, toggles).
- `useRegionFocus()` — focus-cycle model (canvas → inspector → panel → sidebar).

Tenant slots (children of `WorkspaceLayout`):

- `<SidebarSlot>` — left sidebar surface.
- `<InspectorSlot>` — right inspector surface.
- `<PanelSlot>` — bottom panel surface.
- `<CanvasSurface>` — the flexible canvas; renders the active `CanvasTab`.

Lower-level pieces (re-exported for advanced use):

- `TitleBar`, `ResizeHandle`, `WorkspaceTabs`, `WindowTooSmallOverlay`
- `region-solver.ts` — `solveLayout`, `solveWidth`, `solveHeight`,
  `applyPendingSizes`, `computeCanvas`, `clamp`, `SPLITTER_WIDTH`,
  `ABSOLUTE_MIN_CANVAS`, `MIN_CONTAINER_SIZE`, `DEGRADE_ORDER`, `FOCUS_CYCLE`.
- `layout-store-adapter.ts` — `loadLayout`, `saveLayout`, `validateAndRepair`,
  `defaultPersistedLayout`, `PersistedLayout`.
- `use-region-focus.ts` — `useRegionFocus` and its options/result types.

## How it works

### Regions & the solver

The canvas is the only **flex** region; every other region's size is clamped
against `REGION_CONSTRAINTS` (`@/stores/layout-store`) and the canvas absorbs the
remainder. `solveLayout` runs two independent axis solves and takes the smaller
canvas of the two:

```
sidebar + canvas + inspector + (width splitters)  == containerWidth
titleBar + canvas + panel + statusBar + (height splitters) == containerHeight
```

`canvas = min(widthAxis.canvas, heightAxis.canvas)`. Callers wanting a single
axis' invariant should use `solveWidth` / `solveHeight` directly.

Splitter thickness is `SPLITTER_WIDTH = { width: 4, height: 4 }` (via tokens).

### Constraints & degrade ladder

When the canvas drops below its functional floor (`REGION_CONSTRAINTS.canvas.minSize`),
the degrade ladder reclaims space in order: sidebar → rail, then inspector → hidden,
then panel → hidden. As a last resort the canvas is allowed down to
`ABSOLUTE_MIN_CANVAS` (320) — never below.

Below `MIN_CONTAINER_SIZE` (from `@/ui/responsive/breakpoints`) the shell renders
`<WindowTooSmallOverlay>` and stops solving.

### Tenant plug-in points

`WorkspaceLayout` exposes four slot components. A typical app:

```tsx
<WorkspaceLayout>
  <SidebarSlot><MySidebar /></SidebarSlot>
  <InspectorSlot><MyInspector /></InspectorSlot>
  <PanelSlot><MyPanel /></PanelSlot>
  <CanvasSurface><MyCanvas /></CanvasSurface>
</WorkspaceLayout>
```

Each slot forwards refs and applies the solver-computed size via CSS variables
(`--region-w`, `--region-h`) and `min`/`max` constraints. The canvas slot is the
flex surface and should not set its own width/height.

### State & persistence

Layout state lives in `@/stores/layout-store` (Zustand). The provider hydrates a
`PersistedLayout` (`schemaVersion`, `workspaceId`, `regions`, `canvasTabs`,
`lastWindowSize`, `updatedAt`) on mount, debounces writes by 400 ms, and flushes
before `beforeunload`. Store access goes through `layout-store-adapter.ts`
(`loadLayout` / `saveLayout` / `validateAndRepair`), which always returns a
valid layout (garbage input falls back to defaults and clamps out-of-range sizes).

### Keyboard commands

Registered with `when: "appFocused"` against `@/ui/keyboard`:

- `layout.toggleSidebar`
- `layout.toggleInspector`
- `layout.togglePanel`
- `layout.cycleRegionFocus`
- `workspace.switchNext` / `workspace.switchPrev`

## Styling & tokens

All visuals use `--Eulinx-*` design tokens via the `token()` helper
(`@/ui/tokens`). No raw hex or px values are used. Reduced-motion is respected
for tab transitions and splitter previews.

## Missing design-system keys (reported)

These are gaps in the shared foundation, not bugs in this module:

- **Icon**: no dedicated `nav.minimize` icon exists. The title bar uses
  `nav.collapse` for minimize, `nav.expand` for maximize, `nav.close` for close.
- **Animation**: the catalog (`@/ui/animations`) only has `panel.open` /
  `panel.close`. There are no `panelSlide` / `regionResize` tokens, so splitter
  drag and region collapse animate via CSS transitions guarded by
  `usePrefersReducedMotion` rather than the animation catalog.

## Tests

`workspace-layout.test.tsx` (Vitest) covers the region solver's constraints,
clamp/collapse behavior, the two-axis sum invariants, the degrade ladder, and the
focus-cycle model. Tauri/window globals are mocked; run with
`pnpm vitest run src/ui/layout`.
