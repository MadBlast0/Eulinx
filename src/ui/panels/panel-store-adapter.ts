/**
 * Panels — Store Adapter (Panels-Part04 §State Persistence, Part05 §Persistence).
 *
 * Persists only Tier 1 panel arrangement (open instances, their region, group,
 * tab order, and active tab) plus Tier 2 view state per instance. It NEVER
 * persists fetched panel data (Part 01 invariant).
 *
 * Mirrors the theme-loader / layout-store-adapter pattern:
 *  - @tauri-apps/plugin-store with a localStorage fallback;
 *  - versioned blob + forward-only `migrate()` that never throws;
 *  - debounced (400ms) + single-flight flush;
 *  - silent validate/repair (drop unknown kinds, clamp fractions).
 *
 * All Tauri access is guarded so the code runs in the browser dev server.
 */

import { load as loadStore, type Store } from "@tauri-apps/plugin-store"
import type { PanelKind, PanelRegion, PanelArgs, PanelInstanceId, PanelRegistry } from "./panels-registry"

/** Schema version of the persisted panel blob. Bump on any breaking change. */
export const PANEL_SCHEMA_VERSION = 1

/** Debounce window for the trailing persist (Part 05 §Persistence). */
export const PANEL_PERSIST_DEBOUNCE_MS = 400

const STORE_NAME = "eulinx-panels.json"
const STORE_KEY = "panels"
const LOCAL_KEY = "eulinx-panels"

// ---------------------------------------------------------------------------
// Persisted shape (Tier 1 + Tier 2 view state)
// ---------------------------------------------------------------------------

export interface PersistedPanelInstance {
  readonly instanceId: PanelInstanceId
  readonly kind: PanelKind
  readonly region: PanelRegion
  readonly groupId: string
  readonly tabIndex: number
  readonly args: PanelArgs
  /** Tier 2 view state; opaque to the adapter, serialized verbatim. */
  readonly viewState: unknown
}

export interface PersistedPanelGroup {
  readonly groupId: string
  readonly region: PanelRegion
  readonly activeInstanceId: PanelInstanceId | null
  readonly sizeFraction: number
}

export interface PersistedPanels {
  readonly schemaVersion: number
  readonly workspaceId: string
  readonly instances: readonly PersistedPanelInstance[]
  readonly groups: readonly PersistedPanelGroup[]
  readonly updatedAt: string
}

type AnyStored = Record<string, unknown>

// ---------------------------------------------------------------------------
// Guarded Tauri store access
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

/** Reset the memoized store handle. Test-only seam. */
export function __resetPanelStoreForTests(): void {
  storePromise = null
  debounceTimer = null
  inflight = null
  pending = null
}

async function persistBlob(blob: PersistedPanels): Promise<void> {
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

async function loadBlob(): Promise<AnyStored | null> {
  try {
    const store = await getStore()
    if (store) {
      const value = await store.get<PersistedPanels>(STORE_KEY)
      if (value && isValidBlob(value as unknown as AnyStored)) return value as unknown as AnyStored
    }
  } catch {
    // fall through
  }
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && isValidBlob(parsed as AnyStored)) return parsed as AnyStored
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
    typeof value.workspaceId === "string" &&
    Array.isArray(value.instances) &&
    Array.isArray(value.groups)
  )
}

// ---------------------------------------------------------------------------
// Migration (forward only, never throws)
// ---------------------------------------------------------------------------

type Migration = (stored: AnyStored) => AnyStored

const MIGRATIONS: Record<number, Migration> = {}

/**
 * Run the migration chain forward from the stored version to
 * PANEL_SCHEMA_VERSION. A missing step or a from-the-future version means
 * corruption: return null so the caller falls back to the default. Never throws.
 */
export function migrate(stored: AnyStored): AnyStored | null {
  const startVersion = typeof stored.schemaVersion === "number" ? stored.schemaVersion : 0
  if (startVersion > PANEL_SCHEMA_VERSION) return null
  let current = stored
  for (let v = startVersion + 1; v <= PANEL_SCHEMA_VERSION; v++) {
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
// Validation / repair (silent; drops unknown kinds, clamps fractions)
// ---------------------------------------------------------------------------

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function isRegion(value: unknown): value is PanelRegion {
  return value === "left" || value === "right" || value === "bottom" || value === "center"
}

function readInstance(raw: unknown, registry: PanelRegistry): PersistedPanelInstance | null {
  if (typeof raw !== "object" || raw === null) return null
  const r = raw as AnyStored
  if (typeof r.instanceId !== "string") return null
  if (typeof r.kind !== "string") return null
  // Drop any instance whose kind is not in the registry (Part 01/Part 04).
  if (!registry.has(r.kind as PanelKind)) return null
  if (!isRegion(r.region)) return null
  if (typeof r.groupId !== "string") return null
  const tabIndex = typeof r.tabIndex === "number" && Number.isFinite(r.tabIndex) ? r.tabIndex : 0
  const args = typeof r.args === "object" && r.args !== null ? (r.args as PanelArgs) : {}
  return {
    instanceId: r.instanceId,
    kind: r.kind as PanelKind,
    region: r.region,
    groupId: r.groupId,
    tabIndex,
    args,
    viewState: r.viewState ?? null,
  }
}

/**
 * Validate + silently repair a freshly loaded/migrated blob. Drops instances of
 * unknown kinds, drops groups that no longer have members, renormalizes each
 * region's group `sizeFraction` sum to exactly 1.0, and clears any dangling
 * `activeInstanceId`. Never rejects to the user.
 */
export function validateAndRepair(
  blob: AnyStored | null,
  workspaceId: string,
  registry: PanelRegistry,
): PersistedPanels {
  if (!blob || typeof blob !== "object") {
    return buildEmptyPanels(workspaceId)
  }

  const rawInstances = Array.isArray(blob.instances) ? blob.instances : []
  const instances: PersistedPanelInstance[] = []
  for (const raw of rawInstances) {
    const parsed = readInstance(raw, registry)
    if (parsed) instances.push(parsed)
  }

  // Enforce singleton: at most one instance per singleton kind.
  const seenSingleton = new Set<PanelKind>()
  const dedupedInstances = instances.filter((inst) => {
    const desc = registry.tryGet(inst.kind)
    if (desc?.singleton) {
      if (seenSingleton.has(inst.kind)) return false
      seenSingleton.add(inst.kind)
    }
    return true
  })

  const liveGroupIds = new Set(dedupedInstances.map((i) => i.groupId))
  const instanceIds = new Set(dedupedInstances.map((i) => i.instanceId))

  const rawGroups = Array.isArray(blob.groups) ? blob.groups : []
  const groups: PersistedPanelGroup[] = []
  for (const raw of rawGroups) {
    if (typeof raw !== "object" || raw === null) continue
    const g = raw as AnyStored
    if (typeof g.groupId !== "string") continue
    // Drop groups that emptied (invariant: zero-member group is deleted).
    if (!liveGroupIds.has(g.groupId)) continue
    if (!isRegion(g.region)) continue
    const activeInstanceId =
      typeof g.activeInstanceId === "string" && instanceIds.has(g.activeInstanceId)
        ? g.activeInstanceId
        : null
    groups.push({
      groupId: g.groupId,
      region: g.region,
      activeInstanceId,
      sizeFraction: typeof g.sizeFraction === "number" ? clamp01(g.sizeFraction) : 0,
    })
  }

  // Ensure every live group has a record.
  for (const gid of liveGroupIds) {
    if (!groups.some((g) => g.groupId === gid)) {
      const region = dedupedInstances.find((i) => i.groupId === gid)?.region ?? "right"
      groups.push({ groupId: gid, region, activeInstanceId: null, sizeFraction: 0 })
    }
  }

  // Renormalize sizeFraction per region so each region sums to exactly 1.0.
  const byRegion = new Map<PanelRegion, PersistedPanelGroup[]>()
  for (const g of groups) {
    const list = byRegion.get(g.region) ?? []
    list.push(g)
    byRegion.set(g.region, list)
  }
  const normalizedGroups: PersistedPanelGroup[] = []
  for (const list of byRegion.values()) {
    const total = list.reduce((sum, g) => sum + g.sizeFraction, 0)
    for (const g of list) {
      const fraction = total > 0 ? g.sizeFraction / total : 1 / list.length
      normalizedGroups.push({ ...g, sizeFraction: fraction })
      // Backfill a null active pointer to the first member.
      if (g.activeInstanceId === null) {
        const first = dedupedInstances.find((i) => i.groupId === g.groupId)
        if (first) {
          const prev = normalizedGroups[normalizedGroups.length - 1]!
          normalizedGroups[normalizedGroups.length - 1] = {
            groupId: prev.groupId,
            region: prev.region,
            activeInstanceId: first.instanceId ?? null,
            sizeFraction: prev.sizeFraction,
          }
        }
      }
    }
  }

  return {
    schemaVersion: PANEL_SCHEMA_VERSION,
    workspaceId,
    instances: dedupedInstances,
    groups: normalizedGroups,
    updatedAt: new Date().toISOString(),
  }
}

export function buildEmptyPanels(workspaceId: string): PersistedPanels {
  return {
    schemaVersion: PANEL_SCHEMA_VERSION,
    workspaceId,
    instances: [],
    groups: [],
    updatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Public load
// ---------------------------------------------------------------------------

/**
 * Load + migrate + validate the panel arrangement for a workspace. Returns an
 * empty arrangement when nothing is stored (the normal first-run path) or when
 * the stored blob is corrupt. Never throws.
 */
export async function loadPanels(workspaceId: string, registry: PanelRegistry): Promise<PersistedPanels> {
  const blob = await loadBlob()
  if (blob === null) return buildEmptyPanels(workspaceId)
  const migrated = migrate(blob)
  if (migrated === null) return buildEmptyPanels(workspaceId)
  return validateAndRepair(migrated, workspaceId, registry)
}

// ---------------------------------------------------------------------------
// Debounced + single-flight persist (Part 05)
// ---------------------------------------------------------------------------

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let inflight: Promise<void> | null = null
let pending: PersistedPanels | null = null

/**
 * Schedule a trailing-debounced persist. Rapid calls reschedule the timer; only
 * the final state is written. Does not block.
 */
export function schedulePersist(blob: PersistedPanels): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer)
  pending = blob
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void flush(blob)
  }, PANEL_PERSIST_DEBOUNCE_MS)
}

/**
 * Flush immediately. Single-flight: if a write is already in flight, the latest
 * pending state is queued behind it and never dropped, never run concurrently.
 */
export async function flush(blob?: PersistedPanels): Promise<void> {
  if (blob) pending = blob
  if (pending === null) return
  if (inflight !== null) return
  while (pending !== null) {
    const next = pending
    pending = null
    inflight = persistBlob(next).catch(() => undefined)
    await inflight
  }
  inflight = null
}
