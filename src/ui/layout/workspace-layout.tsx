/**
 * P18-UI-DASH — Workspace Layout Shell (WorkspaceLayout-Part01 .. Part06).
 *
 * The top-level window shell: the six-region grid solver, resizable/collapsible
 * panes, custom Tauri title bar, multi-tab canvas, focus model, and the tenant
 * integration points. Every surface mounts inside this shell and is handed its
 * box via props — no surface measures the window.
 *
 * The shell is the single owner of geometry. All sizes are derived by the
 * solver (see `region-solver.ts`) and clamped to `REGION_CONSTRAINTS`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  useLayoutStore,
  REGION_CONSTRAINTS,
  type CanvasTab,
  type LayoutState,
  type RegionId,
  type SizableRegionId,
} from "@/stores/layout-store"
import { token } from "@/ui/tokens"
import { Icon } from "@/ui/icons"
import { useAnnouncer } from "@/a11y/live-region"
import { usePrefersReducedMotion } from "@/ui/responsive/use-breakpoint"
import { keymapRegistry } from "@/ui/keyboard/keymap-registry"
import type { CommandId } from "@/ui/keyboard/keymap-types"
import { computeCollapsePlan } from "@/ui/responsive/collapse-orchestrator"
import { TitleBar } from "./title-bar"
import { TopBar } from "./top-bar"
import { ResizeHandle, type SizeMap, type SizableId } from "./resize-handle"
import { useRegionFocus } from "./use-region-focus"
import { solveLayout, clamp, type ContainerSize } from "./region-solver"
import {
  flush as flushPersist,
  schedulePersist,
  loadLayout,
} from "./layout-store-adapter"

// ---------------------------------------------------------------------------
// Public surface props
// ---------------------------------------------------------------------------

export interface WorkspaceLayoutProps {
  readonly children?: ReactNode
  readonly sidebar?: ReactNode
  readonly inspector?: ReactNode
  readonly panel?: ReactNode
  readonly mode?: "welcome" | "workspace"
  /** Override the title bar workspace name. */
  readonly workspaceName?: string
  readonly sessionName?: string
  /** A fixed window size for non-Tauri / test contexts. Omit to read the window. */
  readonly initialWindowSize?: ContainerSize
  /** Called when the workspace tabs request a new tab. */
  readonly onAddTab?: () => void
}

export interface WorkspaceLayoutApi {
  readonly containerSize: ContainerSize
  readonly sizes: Record<RegionId, number>
  readonly visible: Record<RegionId, boolean>
  readonly focusedRegion: RegionId
  readonly focusVisible: boolean
  readonly tabs: readonly CanvasTab[]
  readonly activeTabId: string
  toggleRegion: (id: SizableRegionId) => void
  collapseRegion: (id: SizableRegionId) => void
  expandRegion: (id: SizableRegionId) => void
  focusRegion: (id: RegionId, viaKeyboard?: boolean) => void
  cycleFocusNext: () => void
  cycleFocusPrev: () => void
  selectTab: (tabId: string) => void
  closeTab: (tabId: string) => void
  addTab: () => void
  resetLayout: () => void
  persistNow: () => void
}

const WorkspaceLayoutContext = createContext<WorkspaceLayoutApi | null>(null)

/** Access the live layout API. Must be used within `<WorkspaceLayoutProvider>`. */
export function useWorkspaceLayout(): WorkspaceLayoutApi {
  const ctx = useContext(WorkspaceLayoutContext)
  if (ctx === null) {
    throw new Error("useWorkspaceLayout must be used within <WorkspaceLayoutProvider>.")
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a RequestedRegions object from a live LayoutState for the orchestrator. */
function requestedRegions(layout: LayoutState) {
  const r = layout.regions
  return {
    sidebar: { visible: r.sidebar.visible || r.sidebar.collapsed, size: r.sidebar.restoreSize || r.sidebar.size },
    inspector: { visible: r.inspector.visible || r.inspector.collapsed, size: r.inspector.restoreSize || r.inspector.size },
    panel: { visible: r.panel.visible || r.panel.collapsed, size: r.panel.restoreSize || r.panel.size },
  }
}

// ---------------------------------------------------------------------------
// Tauri window size reader (guarded)
// ---------------------------------------------------------------------------

function readWindowSize(fallback: ContainerSize): ContainerSize {
  if (typeof window === "undefined") return fallback
  const width = typeof window.innerWidth === "number" ? window.innerWidth : fallback.width
  const height = typeof window.innerHeight === "number" ? window.innerHeight : fallback.height
  return { width, height }
}

// ---------------------------------------------------------------------------
// Provider: owns the store hydration, window size, focus model, and API.
// ---------------------------------------------------------------------------

export interface WorkspaceLayoutProviderProps {
  readonly workspaceId?: string
  readonly children: ReactNode
  readonly initialWindowSize?: ContainerSize
  readonly onAddTab?: () => void
}

export function WorkspaceLayoutProvider({
  workspaceId = "default",
  children,
  initialWindowSize,
  onAddTab,
}: WorkspaceLayoutProviderProps): ReactNode {
  const { layout, isLoading, setLayout, collapseRegion, expandRegion, setFocusedRegion, setActiveTab, removeTab, resetLayout } =
    useLayoutStore()

  const [containerSize, setContainerSize] = useState<ContainerSize>(
    () => initialWindowSize ?? readWindowSize({ width: 1280, height: 720 }),
  )
  const sizeRef = useRef(containerSize)
  sizeRef.current = containerSize

  const announcer = useAnnouncerSafe()

  // Hydrate the layout from persistence on mount.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const size = sizeRef.current
      const loaded = await loadLayout(workspaceId, size)
      if (cancelled) return
      // Only apply the hydrated layout if nothing has taken over yet
      // (a test or parent may have already supplied a layout via resetLayout).
      const current = useLayoutStore.getState()
      if (current.layout && !current.isLoading) return
      setLayout(loaded)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  // Track window size (browser dev only; Tauri uses Eulinx://window/resized).
  useEffect(() => {
    if (initialWindowSize) return
    const onResize = () => setContainerSize(readWindowSize(sizeRef.current))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [initialWindowSize])

  // Persist on layout change (debounced).
  useEffect(() => {
    if (layout && !isLoading) schedulePersist(layout)
  }, [layout, isLoading])

  // Responsive collapse: when the breakpoint drops, auto-collapse in order.
  // We only ever collapse under width pressure — never auto-expand a region the
  // user explicitly toggled off. Expansion on widen is left to the user.
  useEffect(() => {
    if (!layout) return
    const size = sizeRef.current
    const plan = computeCollapsePlan(size, requestedRegions(layout))
    if (plan.tooSmall) return
    const { collapseRegion: cr } = useLayoutStore.getState()
    if (plan.sidebar === "rail") cr("sidebar")
    if (plan.inspector === "hidden") cr("inspector")
    if (plan.panel === "hidden") cr("panel")
  }, [containerSize.width, layout])

  // Focus model wired to live region visibility.
  const isVisible = useCallback(
    (id: RegionId): boolean => {
      if (id === "canvas") return true
      if (id === "sidebar" || id === "inspector" || id === "panel") {
        const r = layout?.regions[id]
        return r ? r.visible && !r.collapsed : true
      }
      // titleBar / statusBar are display surfaces, not focus targets.
      return false
    },
    [layout],
  )

  const focus = useRegionFocus({
    isVisible,
    initial: "canvas",
    keyboardModality: false,
  })

  // Keep the store's focus in sync with the focus controller.
  useEffect(() => {
    setFocusedRegion(focus.focusedRegion)
  }, [focus.focusedRegion, setFocusedRegion])

  // Announce region toggle / focus changes.
  const lastAnnounced = useRef<string>("")
  useEffect(() => {
    const msg = `Focused ${focus.focusedRegion}`
    if (msg !== lastAnnounced.current && announcer) {
      lastAnnounced.current = msg
      announcer.announce("async_load", msg)
    }
  }, [focus.focusedRegion, announcer])

  const api = useMemo<WorkspaceLayoutApi>(() => {
    if (!layout) {
      return {
        containerSize,
        sizes: emptySizes(),
        visible: emptyVisible(),
        focusedRegion: "canvas",
        focusVisible: false,
        tabs: [],
        activeTabId: "",
        toggleRegion: () => {},
        collapseRegion: () => {},
        expandRegion: () => {},
        focusRegion: () => {},
        cycleFocusNext: () => {},
        cycleFocusPrev: () => {},
        selectTab: () => {},
        closeTab: () => {},
        addTab: () => {},
        resetLayout: () => {},
        persistNow: () => {},
      }
    }

    const solved = solveLayout(containerSize, layout.regions)
    const visible: Record<RegionId, boolean> = {
      titleBar: layout.regions.titleBar.visible,
      sidebar: layout.regions.sidebar.visible && !layout.regions.sidebar.collapsed,
      canvas: true,
      inspector: layout.regions.inspector.visible && !layout.regions.inspector.collapsed,
      panel: layout.regions.panel.visible && !layout.regions.panel.collapsed,
      statusBar: layout.regions.statusBar.visible,
    }

    const toggleRegion = (id: SizableRegionId) => {
      const r = layout.regions[id]
      if (r.collapsed || !r.visible) {
        expandRegion(id)
        announcer?.announce("async_load", `${id} shown`)
      } else {
        collapseRegion(id)
        announcer?.announce("async_load", `${id} hidden`)
      }
    }

    return {
      containerSize,
      sizes: solved.sizes,
      visible,
      focusedRegion: focus.focusedRegion,
      focusVisible: focus.focusVisible,
      tabs: layout.canvasTabs.tabs,
      activeTabId: layout.canvasTabs.activeTabId,
      toggleRegion,
      collapseRegion,
      expandRegion,
      focusRegion: (id, viaKeyboard) => focus.focusRegion(id, viaKeyboard),
      cycleFocusNext: focus.cycleNext,
      cycleFocusPrev: focus.cyclePrev,
      selectTab: setActiveTab,
      closeTab: removeTab,
      addTab: () => onAddTab?.(),
      resetLayout: () => resetLayout(workspaceId),
      persistNow: () => void flushPersist(layout),
    }
  }, [layout, containerSize, focus, collapseRegion, expandRegion, setActiveTab, removeTab, resetLayout, workspaceId, onAddTab, announcer])

  return <WorkspaceLayoutContext.Provider value={api}>{children}</WorkspaceLayoutContext.Provider>
}

// ---------------------------------------------------------------------------
// Shell component
// ---------------------------------------------------------------------------

export function WorkspaceLayout({
  children,
  sidebar,
  inspector,
  panel,
  mode = "workspace",
  workspaceName,
  sessionName,
  initialWindowSize,
  onAddTab,
}: WorkspaceLayoutProps): ReactNode {
  return (
    <WorkspaceLayoutProvider initialWindowSize={initialWindowSize} onAddTab={onAddTab}>
      <Shell
        sidebar={sidebar}
        inspector={inspector}
        panel={panel}
        mode={mode}
        workspaceName={workspaceName}
        sessionName={sessionName}
      >
        {children}
      </Shell>
    </WorkspaceLayoutProvider>
  )
}

interface ShellProps {
  readonly sidebar?: ReactNode
  readonly inspector?: ReactNode
  readonly panel?: ReactNode
  readonly mode: "welcome" | "workspace"
  readonly workspaceName?: string
  readonly sessionName?: string
  readonly children?: ReactNode
}

function Shell({ children, sidebar, inspector, panel, mode, workspaceName, sessionName: _sessionName }: ShellProps): ReactNode {
  const { layout, isLoading, updateRegion } = useLayoutStore()
  const api = useWorkspaceLayout()
  const announcer = useAnnouncerSafe()
  const reducedMotion = usePrefersReducedMotion()

  // Keep the live API ref fresh for the registered keyboard commands.
  liveApi.current = api

  // Keyboard commands (layout-scoped). Registered once.
  useEffect(() => {
    registerLayoutCommands()
  }, [])

  // Loading gate: tenants MUST NOT mount before ready (Part01/Part02).
  if (isLoading || !layout) {
    return (
      <div
        className="flex h-screen w-screen items-center justify-center"
        style={{ background: token("--Eulinx-color-surface") }}
      >
        <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
          Loading workspace…
        </span>
      </div>
    )
  }

  const { sizes, visible, focusedRegion, focusVisible, tabs, activeTabId } = api
  const regions = layout.regions
  const solved = solveLayout(api.containerSize, layout.regions)
  const tooSmall = solved.tooSmall
  const workspaceOpen = mode === "workspace"
  const showInspector = workspaceOpen && visible.inspector && inspector !== undefined
  const showPanel = workspaceOpen && visible.panel && panel !== undefined

  const announceResize = (id: SizableId) => {
    announcer?.announce("async_load", `${id} resized to ${Math.round(sizes[id])} pixels`)
  }

  const previewSize = (id: SizableId, value: number) => {
    updateRegion(id, { size: clamp(value, REGION_CONSTRAINTS[id].minSize, REGION_CONSTRAINTS[id].maxSize) })
  }
  const commitSize = (id: SizableId, value: number) => {
    updateRegion(id, { size: clamp(value, REGION_CONSTRAINTS[id].minSize, REGION_CONSTRAINTS[id].maxSize) })
    announceResize(id)
  }

  const onPreview = (pending: SizeMap) => {
    for (const id of Object.keys(pending) as SizableId[]) {
      const v = pending[id]
      if (v !== undefined) previewSize(id, v)
    }
  }
  const onCommit = (pending: SizeMap) => {
    for (const id of Object.keys(pending) as SizableId[]) {
      const v = pending[id]
      if (v !== undefined) commitSize(id, v)
    }
    void flushPersist(useLayoutStore.getState().layout as NonNullable<typeof layout>)
  }

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ background: token("--Eulinx-color-surface"), color: token("--Eulinx-color-text") }}
    >
      {/* Title bar (fixed height, always present) */}
      <TitleBar
        onBeforeClose={() => flushPersist(useLayoutStore.getState().layout as NonNullable<typeof layout>)}
      />

      {/* Main content row */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar */}
        {visible.sidebar &&
          renderRegion("sidebar", focusedRegion, focusVisible, () => (
            <>
              <div style={{ width: sizes.sidebar, minWidth: 0 }}>
                <SidebarSlot>
                  {sidebar ?? <RegionPlaceholder region="sidebar" />}
                </SidebarSlot>
              </div>
              <ResizeHandle
                axis="width"
                regionId="sidebar"
                otherId="inspector"
                label="Resize sidebar"
                currentSize={sizes.sidebar}
                otherSize={sizes.inspector}
                min={REGION_CONSTRAINTS.sidebar.minSize}
                max={REGION_CONSTRAINTS.sidebar.maxSize}
                onPreview={onPreview}
                onCommit={onCommit}
              />
            </>
          ))}

        {/* Rail (collapsed sidebar) */}
        {regions.sidebar.collapsed && regions.sidebar.visible && (
          <button
            type="button"
            aria-label="Expand sidebar"
            onClick={() => api.expandRegion("sidebar")}
            className="flex shrink-0 flex-col items-center gap-2 border-r py-2 outline-none"
            style={{
              width: REGION_CONSTRAINTS.sidebar.railSize,
              borderColor: token("--Eulinx-color-border"),
              background: token("--Eulinx-color-surface"),
              transition: reducedMotion ? "none" : `background-color ${token("--Eulinx-duration-hover")} var(--Eulinx-ease-standard)`,
            }}
          >
            <RailButton icon="domain.panel.left" label="Expand sidebar" />
          </button>
        )}

        {/* Canvas (flex region) */}
        <div
          className="flex min-w-0 flex-1 flex-col overflow-hidden"
          data-eulinx-focus={focusedRegion === "canvas" && focusVisible ? "true" : undefined}
          onClick={() => api.focusRegion("canvas")}
          style={{ width: sizes.canvas }}
        >
          <TopBar
            projectName={workspaceName || (workspaceOpen ? "Eulinx" : "Start")}
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={api.selectTab}
            onCloseTab={api.closeTab}
            onAddTab={api.addTab}
            isConnected={true}
            workspaceOpen={workspaceOpen}
            focusVisible={focusedRegion === "canvas" && focusVisible}
          />
          <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>

        {/* Inspector */}
        {showInspector &&
          renderRegion("inspector", focusedRegion, focusVisible, () => (
            <>
              <ResizeHandle
                axis="width"
                regionId="inspector"
                otherId="sidebar"
                label="Resize inspector"
                currentSize={sizes.inspector}
                otherSize={sizes.sidebar}
                min={REGION_CONSTRAINTS.inspector.minSize}
                max={REGION_CONSTRAINTS.inspector.maxSize}
                onPreview={onPreview}
                onCommit={onCommit}
              />
              <div style={{ width: sizes.inspector, minWidth: 0 }}>
                <InspectorSlot>
                  {inspector ?? <RegionPlaceholder region="inspector" />}
                </InspectorSlot>
              </div>
            </>
          ))}
      </div>

      {/* Panel (bottom) */}
      {showPanel &&
        renderRegion("panel", focusedRegion, focusVisible, () => (
          <div
            className="relative flex shrink-0 flex-col overflow-hidden border-t"
            data-eulinx-focus={focusedRegion === "panel" && focusVisible ? "true" : undefined}
            onClick={() => api.focusRegion("panel")}
            style={{
              height: sizes.panel,
              borderColor: token("--Eulinx-color-border"),
              background: token("--Eulinx-color-surface"),
              transition: reducedMotion
                ? "none"
                : `height ${token("--Eulinx-duration-card")} var(--Eulinx-ease-standard)`,
            }}
          >
            <ResizeHandle
              axis="height"
              regionId="panel"
              label="Resize panel"
              currentSize={sizes.panel}
              min={REGION_CONSTRAINTS.panel.minSize}
              max={REGION_CONSTRAINTS.panel.maxSize}
              onPreview={onPreview}
              onCommit={onCommit}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <PanelSlot>
                {panel ?? <RegionPlaceholder region="panel" />}
              </PanelSlot>
            </div>
          </div>
        ))}

      {/* Status bar (fixed height, always present) */}
      <div
        className="flex shrink-0 items-center justify-between px-3 text-[11px]"
        style={{
          height: sizes.statusBar,
          background: token("--Eulinx-color-surface"),
          borderTop: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
          color: token("--Eulinx-color-text-muted"),
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: token("--Eulinx-color-success"),
              }}
            />
            Ready
          </span>
          <span>{workspaceOpen ? `ws: ${layout.workspaceId}` : "No workspace open"}</span>
        </div>
        <div className="flex items-center gap-3">
          {workspaceOpen ? <span>{tabs.length} tabs</span> : null}
          <span>v0.0.1</span>
        </div>
      </div>

      {tooSmall && <WindowTooSmallOverlay size={api.containerSize} />}
    </div>
  )
}

/** Overlay shown when the container drops below MIN_WINDOW_SIZE (Part01/Part03). */
function WindowTooSmallOverlay({ size }: { size: ContainerSize }): ReactNode {
  return (
    <div
      role="alertdialog"
      aria-label="Window too small"
      className="absolute inset-0 flex flex-col items-center justify-center gap-2"
      style={{ background: token("--Eulinx-color-surface"), color: token("--Eulinx-color-text") }}
    >
      <Icon name="status.warning" size="xl" aria-hidden />
      <span className="text-role-body">Window too small</span>
      <span className="text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
        Resize to at least 940 × 560 px. Current: {Math.round(size.width)} × {Math.round(size.height)}.
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Region wrappers that paint the focus ring when keyboard-focused.
// ---------------------------------------------------------------------------

function renderRegion(
  id: RegionId,
  focused: RegionId,
  focusVisible: boolean,
  content: () => ReactNode,
): ReactNode {
  const isFocused = focused === id && focusVisible
  return (
    <div
      className="flex shrink-0"
      data-eulinx-region={id}
      data-eulinx-focus={isFocused ? "true" : undefined}
      onClick={(e) => {
        // Stop the canvas handler from stealing focus, then focus this region.
        e.stopPropagation()
        liveApi.current?.focusRegion(id)
      }}
      style={{
        outline: isFocused ? "2px solid var(--Eulinx-focus-ring, hsl(var(--ring)))" : "none",
        outlineOffset: isFocused ? "2px" : undefined,
      }}
    >
      {content()}
    </div>
  )
}

/** Tenant slots: the shell hands each tenant its box via props. */
export function SidebarSlot({ children }: { children: ReactNode }): ReactNode {
  return (
    <div
      data-eulinx-surface="sidebar"
      className="h-full overflow-y-auto"
      style={{ background: token("--Eulinx-color-sidebar-bg") ?? token("--Eulinx-color-surface") }}
    >
      {children}
    </div>
  )
}
export function InspectorSlot({ children }: { children: ReactNode }): ReactNode {
  return (
    <div
      data-eulinx-surface="inspector"
      className="h-full overflow-y-auto border-l"
      style={{ borderColor: token("--Eulinx-color-border"), background: token("--Eulinx-color-surface") }}
    >
      {children}
    </div>
  )
}
export function PanelSlot({ children }: { children: ReactNode }): ReactNode {
  return (
    <div data-eulinx-surface="panel" className="h-full overflow-hidden">
      {children}
    </div>
  )
}
/** The center host for the active tab content (NodeGraph / TerminalView). */
export function CanvasSurface({ children }: { children: ReactNode }): ReactNode {
  return (
    <div data-eulinx-surface="graph" className="h-full w-full overflow-hidden">
      {children}
    </div>
  )
}

/** Default placeholder shown until a tenant mounts a region's content. */
function RegionPlaceholder({ region }: { region: RegionId }): ReactNode {
  return (
    <div className="flex h-full items-center justify-center p-3 text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
      {region}
    </div>
  )
}

function RailButton({ icon, label }: { icon: string; label: string }): ReactNode {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded hover:bg-[color:var(--Eulinx-color-surface-2)]" aria-hidden>
      <Icon name={icon} size="md" aria-label={label} />
    </span>
  )
}

// ---------------------------------------------------------------------------
// Helpers: safe announcer access + command registration
// ---------------------------------------------------------------------------

function useAnnouncerSafe(): ReturnType<typeof useAnnouncer> | null {
  try {
    return useAnnouncer()
  } catch {
    return null
  }
}

/** Live reference to the current API, so registered commands never go stale. */
const liveApi: { current: WorkspaceLayoutApi | null } = { current: null }

function registerLayoutCommands(): void {
  const entries: Array<{ id: CommandId; run: () => void }> = [
    { id: "layout.toggleSidebar", run: () => liveApi.current?.toggleRegion("sidebar") },
    { id: "layout.toggleInspector", run: () => liveApi.current?.toggleRegion("inspector") },
    { id: "layout.togglePanel", run: () => liveApi.current?.toggleRegion("panel") },
    { id: "layout.cycleRegionFocus", run: () => liveApi.current?.cycleFocusNext() },
    { id: "workspace.switchNext", run: () => liveApi.current?.cycleFocusNext() },
    { id: "workspace.switchPrev", run: () => liveApi.current?.cycleFocusPrev() },
  ]
  for (const { id, run } of entries) {
    if (keymapRegistry.getCommand(id)) continue
    keymapRegistry.registerCommand({
      id,
      title: id,
      category: "View",
      description: id,
      palette: true,
      run,
    })
    keymapRegistry.registerBinding({
      commandId: id,
      chords: [],
      scope: "global",
      when: "appFocused",
      source: "default",
      enabled: true,
    })
  }
}

// ---------------------------------------------------------------------------
// Empty defaults (loading state)
// ---------------------------------------------------------------------------

function emptySizes(): Record<RegionId, number> {
  return { titleBar: 32, sidebar: 260, canvas: 480, inspector: 320, panel: 240, statusBar: 24 }
}
function emptyVisible(): Record<RegionId, boolean> {
  return { titleBar: true, sidebar: true, canvas: true, inspector: true, panel: true, statusBar: true }
}
