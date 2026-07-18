# Sidebar (Eulinx UI)

The left navigation rail of the Eulinx window. A **navigator**, not an inspector:
it selects things (workspace, file, worker, workflow, session) and never edits
them. Implements the spec in `Docs/07-ui-ux/Sidebar/`.

## Public API

| Export | Kind | Purpose |
| --- | --- | --- |
| `Sidebar` | component | The full sidebar (sections + search + switcher). Reads `SidebarProvider`. |
| `SidebarInLayout` | component | Drops `Sidebar` into the WorkspaceLayout `sidebar` region `SidebarSlot`. |
| `SidebarProvider` | component | Owns rail/expanded mode + per-section collapse (Tier 2 view state) + data. |
| `useSidebar` | hook | Access live context: `mode`, `collapsed`, `sections`, `data`, toggles. |
| `FileTree` | component | Virtualized, keyboard-navigable file tree. |
| `VirtualList` | component | Reusable windowed list (only visible + overscan rows mount). |
| `WorkspaceSwitcher` | component | Workspace list + switch + filter. |
| `WorkerList` | component | Workers grouped by state, with state pills. |
| `WorkflowList` | component | Workflows with status pills. |
| `SessionList` | component | Session history with open/closed pills. |
| `SidebarSearch` | component | Command-palette entry + local quick filter. |
| `SidebarSection` | component | Collapsible section wrapper. |
| `StatePill`, `WorkerStatePill` | component | Non-color triple (icon + label + color token). |
| `sidebar-data` types | types | Data-shape contract (below). |

## Mounting

```tsx
<SidebarProvider data={data} initialMode="expanded">
  <SidebarInLayout
    onNavigate={({ kind, id }) => { /* select in canvas/panels */ }}
    onSwitchWorkspace={(id) => { /* set active workspace; NEVER kill workers */ }}
    onOpenPalette={() => { /* open command palette */ }}
  />
</SidebarProvider>
```

## Data-shape contract (`sidebar-data.ts`)

All data is consumed via props/context — **no backend calls live here**. The
app feeds real data later by satisfying these interfaces:

```ts
interface Workspace {
  id: string
  name: string
  projectName?: string
  description?: string
}

interface FileNode {
  path: string            // absolute, OS-native, unique key
  name: string            // basename
  kind: "file" | "directory" | "symlink"
  sizeBytes: number | null
  modifiedAt: string      // ISO 8601
  childCount: number | null
  gitStatus: GitRowStatus | null
  isIgnored: boolean
}

type GitRowStatus =
  | "untracked" | "modified" | "added" | "deleted" | "renamed" | "conflicted"

interface WorkerSummary {
  workerId: string
  label: string
  state: WorkerState      // the canonical 13 states from @/a11y
  health: "healthy" | "degraded" | "unresponsive" | "unknown"
  projectId: string
  sessionId: string
  parentWorkerId: string | null
  depth: number
  startedAt: string | null
}

interface WorkflowSummary {
  workflowId: string
  name: string
  status: "draft" | "running" | "paused" | "completed" | "failed"
  nodeCount: number
  completedNodeCount: number
  updatedAt: string
}

interface SessionSummary {
  sessionId: string
  title: string
  startedAt: string
  endedAt: string | null
  workerCount: number
  artifactCount: number
}

interface SidebarData {
  workspaces: readonly Workspace[]
  activeWorkspaceId: string | null
  activeProjectId: string | null
  rootNodes: readonly FileNode[]
  loadChildren: (path: string) => Promise<readonly FileNode[]>
  workers: readonly WorkerSummary[]
  workflows: readonly WorkflowSummary[]
  sessions: readonly SessionSummary[]
}
```

`WorkerState` is re-exported from `@/a11y` (the canonical 13 lifecycle states) so
the Sidebar never diverges from the accessibility model.

## Behaviour

- **Virtualization**: `FileTree` + `VirtualList` window rows; only visible + 8
  overscan rows mount. Threshold for "virtualized" rendering is implicit in the
  constant `TREE_VIRTUALIZE_THRESHOLD` (100).
- **Lazy children**: `loadChildren(path)` is called on first expand only.
- **Keyboard nav** (tree): ArrowUp/Down move, Right/Left expand/collapse,
  Enter/Space navigate, Home/End jump, type-ahead focuses a row. One tab stop,
  roving tabindex.
- **Rail mode**: width collapses to 48px, labels hidden, only icons. Click/focus
  an icon expands to full. Collapse is a CSS width change, never an unmount.
- **State pills**: workers use `getStateSignal(state)` (color token + icon +
  label). No state is signalled by color alone.
- **Reduced motion**: durations collapse to 0ms via the token system.

## Tokens used

All visuals read `var(--Eulinx-*)`: `--Eulinx-color-sidebar-bg`,
`--Eulinx-color-elevated`, `--Eulinx-color-border`, `--Eulinx-color-text-*`,
`--Eulinx-color-accent`, `--Eulinx-color-state-*` (13 worker states),
`--Eulinx-space-*`, `--Eulinx-radius-*`, `--Eulinx-z-dropdown`,
`--Eulinx-elev-md`, `--Eulinx-duration-*`, `--Eulinx-ease-*`.

## Notes / gaps

- `sidebar.*` / `navigation.*` command ids are intentionally NOT registered in
  the keymap; `view.toggleSidebar` (Ctrl+B) and `palette.open` (Ctrl+K) already
  exist. Add dedicated `sidebar.openPalette` / `navigation.focusTree` commands
  when the spec finalizes their bindings.
- No `file`/`worker`/`workflow`/`session` **icon keys** exist in the registry;
  the list rows reuse `domain.*` glyphs. The 13 worker-state glyphs
  (`worker.state.*`) and `domain.workflow`/`domain.session`/`domain.worker` do
  exist.
- Sidebar geometry width (220..480, default 280, rail 48) is owned by
  WorkspaceLayout's region store; this module only owns rail/expanded + sections.
