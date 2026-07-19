/**
 * P18-UI-DASH — Layout Store Adapter (WorkspaceLayout-Part04).
 *
 * Bridges the layout shell to persistence + migration:
 *  - mirrors the theme loader's plugin-store + localStorage fallback pattern;
 *  - persists only `PersistedLayout` (never `focus`, never `canvas.size`);
 *  - debounced at 400ms, single-flight on flush (Part04);
 *  - forward-only migration chain that never throws;
 *  - validation/repair that silently clamps to the constraint table.
 *
 * All Tauri access is guarded so the shell runs in the browser dev server.
 */

import { load as loadStore, type Store } from "@tauri-apps/plugin-store"
import { REGION_CONSTRAINTS, type CanvasTabsState, type LayoutState, type RegionId, type RegionState } from "@/stores/layout-store"
import { clamp } from "./region-solver"

/** Schema version of the persisted layout blob. Bump on any breaking change. */
export const LAYOUT_SCHEMA_VERSION = 1

/** Where the layout blobs live inside the store / localStorage. */
const STORE_NAME = "eulinx-layout.json"
const STORE_KEY = "layout"
const LOCAL_KEY = "eulinx-layout"

/** Debounce window for trailing persist (Part04). */
export const PERSIST_DEBOUNCE_MS = 400

/** What actually crosses the wire (Part01 §PersistedLayout). */
export interface PersistedLayout {
  readonly schemaVersion: number
  readonly workspaceId: string
  readonly regions: Record<RegionId, RegionState>
  readonly canvasTabs: CanvasTabsState
  readonly lastWindowSize: { width: number; height: number }
  readonly updatedAt: string
}

/** The shape a stored blob may take before migration. */
type AnyStored = Record<string, unknown>

// ---------------------------------------------------------------------------
// Tauri store access (guarded)
// ---------------------------------------------------------------------------

let storePromise: Promise<Store | null> | null = null

function getStore(): Promise<Store | null> {
  if (storePromise) return storePromise
  storePromise = (async () => {
    try {
      return await loadStore(STORE_NAME)
    } catch {
      return null
    }
  })()
  return storePromise
}

async function persistBlob(blob: PersistedLayout): Promise<void> {
  try {
    const store = await getStore()
    if (store) {
      await store.set(STORE_KEY, blob)
      await store.save()
      return
    }
  } catch {
    // fall through to localStorage
  }
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(blob))
  } catch {
    // best-effort only
  }
}

async function loadBlob(_workspaceId: string): Promise<PersistedLayout | null> {
  try {
    const store = await getStore()
    if (store) {
      const value = await store.get<PersistedLayout>(STORE_KEY)
      if (value && isValidBlob(value as unknown as AnyStored)) return value
    }
  } catch {
    // fall through
  }
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && isValidBlob(parsed as AnyStored)) return parsed as PersistedLayout
    }
  } catch {
    // ignore
  }
  return null
}

function isValidBlob(value: AnyStored): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as AnyStored).workspaceId === "string" &&
    typeof (value as AnyStored).regions === "object"
  )
}

// ---------------------------------------------------------------------------
// Migration (forward only, never throws — falls back to DEFAULT_LAYOUT)
// ---------------------------------------------------------------------------

type Migration = (stored: AnyStored) => AnyStored

const MIGRATIONS: Record<number, Migration> = {}

/**
 * Run the migration chain forward from the stored version to LAYOUT_SCHEMA_VERSION.
 * A missing migration step means corruption: return null so the caller falls
 * back to DEFAULT_LAYOUT. Never throws.
 */
export function migrate(stored: AnyStored): AnyStored | null {
  const startVersion = typeof stored.schemaVersion === "number" ? stored.schemaVersion : 0
  if (startVersion > LAYOUT_SCHEMA_VERSION) return null // from the future -> fall back
  let current = stored
  for (let v = startVersion + 1; v <= LAYOUT_SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v]
    if (!step) return null
    try {
      current = step(current)
    } catch {
      return null
    }
  }
  return current
}

// ---------------------------------------------------------------------------
// Validation / repair (silent clamp to constraints)
// ---------------------------------------------------------------------------

function isRegionState(value: unknown): value is RegionState {
  if (typeof value !== "object" || value === null) return false
  const r = value as Record<string, unknown>
  return (
    typeof r.id === "string" &&
    typeof r.visible === "boolean" &&
    typeof r.collapsed === "boolean" &&
    typeof r.size === "number" &&
    typeof r.restoreSize === "number"
  )
}

/**
 * Validate and silently repair a freshly loaded/migrated blob against the
 * Part01 invariants. Returns a `LayoutState` whose regions all satisfy the
 * constraint table. Never rejects the layout to the user.
 */
export function validateAndRepair(
  blob: AnyStored | null,
  containerSize: { width: number; height: number },
  workspaceId: string,
): LayoutState {
  if (!blob || typeof blob !== "object") {
    return buildDefaultLayout(workspaceId, containerSize)
  }

  const regionsRaw = blob.regions as AnyStored | undefined
  const regions: Record<RegionId, RegionState> = buildDefaultRegionStates()

  for (const id of Object.keys(regions) as RegionId[]) {
    const raw = regionsRaw?.[id]
    if (!isRegionState(raw)) continue
    const constraint = REGION_CONSTRAINTS[id]
    if (raw.collapsed) {
      const size = constraint.collapseMode === "rail" ? constraint.railSize : 0
      regions[id] = {
        ...raw,
        size,
        restoreSize: clamp(raw.restoreSize, constraint.minSize, constraint.maxSize),
      }
      continue
    }
    regions[id] = {
      ...raw,
      size: clamp(raw.size, constraint.minSize, constraint.maxSize),
      restoreSize: clamp(raw.restoreSize, constraint.minSize, constraint.maxSize),
    }
  }

  // canvas is always visible, never collapsed, size derived.
  regions.canvas = { id: "canvas", visible: true, collapsed: false, size: 0, restoreSize: 0 }

  const tabs = normalizeTabs(blob.canvasTabs)

  return {
    schemaVersion: LAYOUT_SCHEMA_VERSION,
    workspaceId,
    regions,
    canvasTabs: tabs,
    focus: { focusedRegion: "canvas", previousRegion: null, focusVisible: false },
    lastWindowSize: containerSize,
    updatedAt: new Date().toISOString(),
  }
}

function normalizeTabs(raw: unknown): CanvasTabsState {
  if (typeof raw !== "object" || raw === null) {
    return defaultTabs()
  }
  const t = raw as AnyStored
  const tabs = Array.isArray(t.tabs) ? (t.tabs as CanvasTabsState["tabs"]) : []
  if (tabs.length === 0) return defaultTabs()
  const validTabs = tabs.filter((tab) => tab && typeof tab.tabId === "string" && typeof tab.title === "string")
  const mru = Array.isArray(t.mruOrder) ? (t.mruOrder as string[]) : validTabs.map((x) => x.tabId)
  const orderedMru = validTabs.map((x) => x.tabId).filter((id) => mru.includes(id))
  const fallbackId = validTabs[0]?.tabId ?? ""
  const active =
    typeof t.activeTabId === "string" && validTabs.some((x) => x.tabId === t.activeTabId)
      ? (t.activeTabId as string)
      : fallbackId
  return { tabs: validTabs, activeTabId: active, mruOrder: orderedMru.length ? orderedMru : [active] }
}

function defaultTabs(): CanvasTabsState {
  return {
    tabs: [{ tabId: "graph", kind: "graph", title: "Graph", subjectId: null, pinned: true }],
    activeTabId: "graph",
    mruOrder: ["graph"],
  }
}

// ---------------------------------------------------------------------------
// Default layout factory (the one true DEFAULT_LAYOUT)
// ---------------------------------------------------------------------------

export function buildDefaultRegionStates(): Record<RegionId, RegionState> {
  return {
    titleBar: { id: "titleBar", visible: true, collapsed: false, size: 36, restoreSize: 36 },
    sidebar: { id: "sidebar", visible: true, collapsed: false, size: 240, restoreSize: 240 },
    canvas: { id: "canvas", visible: true, collapsed: false, size: 0, restoreSize: 0 },
    inspector: { id: "inspector", visible: false, collapsed: true, size: 0, restoreSize: 320 },
    panel: { id: "panel", visible: false, collapsed: true, size: 0, restoreSize: 220 },
    statusBar: { id: "statusBar", visible: true, collapsed: false, size: 24, restoreSize: 24 },
  }
}

export function buildDefaultLayout(
  workspaceId: string,
  containerSize: { width: number; height: number } = { width: 1280, height: 720 },
): LayoutState {
  return {
    schemaVersion: LAYOUT_SCHEMA_VERSION,
    workspaceId,
    regions: buildDefaultRegionStates(),
    canvasTabs: defaultTabs(),
    focus: { focusedRegion: "canvas", previousRegion: null, focusVisible: false },
    lastWindowSize: containerSize,
    updatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Public load + persisted-shape extraction
// ---------------------------------------------------------------------------

/**
 * Load + migrate + validate a workspace layout. Returns DEFAULT_LAYOUT when the
 * stored blob is null/garbage (the normal first-run path, NOT an error).
 */
export async function loadLayout(
  workspaceId: string,
  containerSize: { width: number; height: number },
): Promise<LayoutState> {
  const blob = await loadBlob(workspaceId)
  if (blob === null) {
    return buildDefaultLayout(workspaceId, containerSize)
  }
  const migrated = migrate(blob as unknown as AnyStored)
  if (migrated === null) {
    return buildDefaultLayout(workspaceId, containerSize)
  }
  return validateAndRepair(migrated, containerSize, workspaceId)
}

/**
 * Extract the wire-only `PersistedLayout` from a full `LayoutState`.
 * Drops `focus` and any tenant-only fields; keeps canvas tabs but NOT a stored
 * canvas size (it is derived).
 */
export function toPersisted(layout: LayoutState): PersistedLayout {
  const regions = { ...layout.regions }
  // Strip the derived canvas size so it is never restored as truth.
  delete (regions as Record<string, unknown>).canvas
  return {
    schemaVersion: LAYOUT_SCHEMA_VERSION,
    workspaceId: layout.workspaceId,
    regions: regions as Record<RegionId, RegionState>,
    canvasTabs: layout.canvasTabs,
    lastWindowSize: layout.lastWindowSize,
    updatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Debounced + single-flight persist (Part04)
// ---------------------------------------------------------------------------

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let inflight: Promise<void> | null = null
let pending: PersistedLayout | null = null

/**
 * Schedule a trailing-debounced persist. Rapid calls reschedule the timer;
 * only the final state is written. Does not block.
 */
export function schedulePersist(layout: LayoutState): void {
  const blob = toPersisted(layout)
  if (debounceTimer !== null) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void flush(layout)
  }, PERSIST_DEBOUNCE_MS)
  pending = blob
  void persistBlob(blob) // best-effort immediate mirror; flush ensures order
}

/**
 * Flush immediately (drag end, window close). Single-flight: if a write is
 * already in flight, the latest pending state is queued behind it and never
 * dropped, never run concurrently (Part04 §Single-Flight Rule).
 */
export async function flush(layout: LayoutState): Promise<void> {
  pending = toPersisted(layout)
  if (inflight !== null) return
  while (pending !== null) {
    const next = pending
    pending = null
    inflight = persistBlob(next).catch(() => undefined)
    await inflight
  }
  inflight = null
}
