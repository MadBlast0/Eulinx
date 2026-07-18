/**
 * Panels — the PanelProvider, reducer, and `usePanels` hook (Panels-Part01
 * §States/§Invariants, Part 05 §Persistence).
 *
 * This module owns the runtime layout model: the set of open PanelInstances,
 * their groups, active tabs, and dock regions. It is the ONLY thing that drives
 * the state machine. Components read it via `usePanels()`.
 *
 * The model is deliberately framework-thin: a pure reducer plus a thin React
 * context. The host renders it; persistence mirrors it.
 */

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react"
import {
  PANEL_REGISTRY,
  type PanelArgs,
  type PanelDescriptor,
  type PanelErrorState,
  type PanelInstanceId,
  type PanelKind,
  type PanelLifecycle,
  type PanelLifecycleContext,
  type PanelRegion,
  type PanelRegistry,
} from "./panels-registry"
import {
  buildEmptyPanels,
  flush,
  loadPanels,
  schedulePersist,
  type PersistedPanels,
} from "./panel-store-adapter"

// ---------------------------------------------------------------------------
// Runtime model
// ---------------------------------------------------------------------------

export interface PanelInstance {
  readonly instanceId: PanelInstanceId
  readonly kind: PanelKind
  readonly region: PanelRegion
  readonly groupId: string
  readonly tabIndex: number
  readonly title: string
  readonly mounted: boolean
  readonly active: boolean
  /** Epoch ms since the tab was hidden, or null when active/never-hidden. */
  readonly hiddenSinceMs: number | null
  readonly viewState: unknown
  readonly errorState: PanelErrorState | null
  readonly args: PanelArgs
  /** Per-instance lifecycle overrides (merged over the descriptor's). */
  readonly lifecycle: PanelLifecycle | null
  /** True once minimized (collapsed to its tab only, content unmounted). */
  readonly minimized: boolean
  /** True while this instance's group is maximized within its region. */
  readonly maximized: boolean
}

export interface PanelGroup {
  readonly groupId: string
  readonly region: PanelRegion
  readonly instanceIds: readonly PanelInstanceId[]
  readonly activeInstanceId: PanelInstanceId | null
  readonly sizeFraction: number
}

export interface PanelsState {
  readonly workspaceId: string
  readonly instances: Readonly<Record<PanelInstanceId, PanelInstance>>
  readonly groups: Readonly<Record<string, PanelGroup>>
  /** Insertion order of groups, used for deterministic rendering. */
  readonly groupOrder: readonly string[]
  readonly hydrated: boolean
}

export interface OpenPanelOptions {
  readonly args?: PanelArgs
  readonly region?: PanelRegion
  readonly groupId?: string
  readonly lifecycle?: PanelLifecycle
  /** When true, focus the panel after opening (default true). */
  readonly focus?: boolean
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: "hydrate"; state: PanelsState }
  | { type: "open"; instanceId: PanelInstanceId; kind: PanelKind; descriptor: PanelDescriptor; options: OpenPanelOptions }
  | { type: "close"; instanceId: PanelInstanceId }
  | { type: "focus"; instanceId: PanelInstanceId }
  | { type: "setActive"; groupId: string; instanceId: PanelInstanceId }
  | { type: "reorder"; groupId: string; fromIndex: number; toIndex: number }
  | { type: "mount"; instanceId: PanelInstanceId }
  | { type: "unmount"; instanceId: PanelInstanceId }
  | { type: "minimize"; instanceId: PanelInstanceId }
  | { type: "restore"; instanceId: PanelInstanceId }
  | { type: "maximize"; instanceId: PanelInstanceId }
  | { type: "unmaximize"; instanceId: PanelInstanceId }
  | { type: "setViewState"; instanceId: PanelInstanceId; viewState: unknown }
  | { type: "setError"; instanceId: PanelInstanceId; error: PanelErrorState | null }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idCounter = 0

/** Unique-for-workspace-lifetime instance id (Part 01 responsibility). */
export function nextInstanceId(kind: PanelKind): PanelInstanceId {
  idCounter += 1
  return `pi_${kind}_${idCounter.toString(36)}_${Date.now().toString(36)}`
}

export function defaultGroupId(region: PanelRegion): string {
  return `g_${region}_1`
}

function findSingleton(state: PanelsState, kind: PanelKind): PanelInstance | null {
  for (const id of Object.keys(state.instances)) {
    const inst = state.instances[id]
    if (inst && inst.kind === kind) return inst
  }
  return null
}

function reindexGroup(state: PanelsState, groupId: string): PanelsState {
  const group = state.groups[groupId]
  if (!group) return state
  const instances = { ...state.instances }
  group.instanceIds.forEach((id, index) => {
    const inst = instances[id]
    if (inst && inst.tabIndex !== index) instances[id] = { ...inst, tabIndex: index }
  })
  return { ...state, instances }
}

/** Rebuild a group's activeInstanceId + every instance's `active` flag. */
function applyActive(state: PanelsState, groupId: string, activeId: PanelInstanceId | null): PanelsState {
  const group = state.groups[groupId]
  if (!group) return state
  const instances = { ...state.instances }
  const now = Date.now()
  for (const id of group.instanceIds) {
    const inst = instances[id]
    if (!inst) continue
    const isActive = id === activeId
    if (inst.active === isActive) continue
    instances[id] = {
      ...inst,
      active: isActive,
      hiddenSinceMs: isActive ? null : now,
      // Mounting is deferred to PanelMountGate on first activation (lazy).
      // Deactivating keeps the component mounted until the idle-unmount timer.
      minimized: isActive ? false : inst.minimized,
    }
  }
  return {
    ...state,
    instances,
    groups: { ...state.groups, [groupId]: { ...group, activeInstanceId: activeId } },
  }
}

// ---------------------------------------------------------------------------
// Reducer (pure)
// ---------------------------------------------------------------------------

export function panelsReducer(state: PanelsState, action: Action): PanelsState {
  switch (action.type) {
    case "hydrate":
      return action.state

    case "open": {
      const { instanceId, kind, descriptor, options } = action
      const region = options.region ?? descriptor.defaultRegion
      const groupId = options.groupId ?? defaultGroupId(region)

      const existingGroup = state.groups[groupId]
      const tabIndex = existingGroup ? existingGroup.instanceIds.length : 0

      const instance: PanelInstance = {
        instanceId,
        kind,
        region,
        groupId,
        tabIndex,
        title: descriptor.title,
        mounted: false,
        active: false,
        hiddenSinceMs: null,
        viewState: null,
        errorState: null,
        args: options.args ?? {},
        lifecycle: options.lifecycle ?? null,
        minimized: false,
        maximized: false,
      }

      const groups = { ...state.groups }
      let groupOrder = state.groupOrder
      if (existingGroup) {
        groups[groupId] = { ...existingGroup, instanceIds: [...existingGroup.instanceIds, instanceId] }
      } else {
        groups[groupId] = {
          groupId,
          region,
          instanceIds: [instanceId],
          activeInstanceId: null,
          sizeFraction: 1,
        }
        groupOrder = [...state.groupOrder, groupId]
      }

      let next: PanelsState = {
        ...state,
        instances: { ...state.instances, [instanceId]: instance },
        groups,
        groupOrder,
      }
      // Newly opened panel becomes the active tab of its group.
      next = applyActive(next, groupId, instanceId)
      return next
    }

    case "close": {
      const inst = state.instances[action.instanceId]
      if (!inst) return state
      const group = state.groups[inst.groupId]
      const instances: Record<PanelInstanceId, PanelInstance> = {}
      for (const id of Object.keys(state.instances)) {
        if (id !== action.instanceId) instances[id] = state.instances[id]!
      }

      let groups: Record<string, PanelGroup> = { ...state.groups }
      let groupOrder = state.groupOrder
      if (group) {
        const remaining = group.instanceIds.filter((id) => id !== action.instanceId)
        if (remaining.length === 0) {
          // Zero-member group is deleted in the same commit (invariant).
          const rebuilt: Record<string, PanelGroup> = {}
          for (const gid of Object.keys(groups)) {
            if (gid !== inst.groupId && groups[gid]) rebuilt[gid] = groups[gid]!
          }
          groups = rebuilt
          groupOrder = state.groupOrder.filter((id) => id !== inst.groupId)
        } else {
          const nextActive =
            group.activeInstanceId === action.instanceId ? remaining[0]! : group.activeInstanceId
          groups[inst.groupId] = { ...group, instanceIds: remaining, activeInstanceId: nextActive }
        }
      }

      let next: PanelsState = { ...state, instances, groups, groupOrder }
      if (groups[inst.groupId]) {
        next = reindexGroup(next, inst.groupId)
        next = applyActive(next, inst.groupId, groups[inst.groupId]!.activeInstanceId)
      }
      return next
    }

    case "focus":
    case "setActive": {
      const instanceId = action.type === "focus" ? action.instanceId : action.instanceId
      const inst = state.instances[instanceId]
      if (!inst) return state
      return applyActive(state, inst.groupId, instanceId)
    }

    case "reorder": {
      const group = state.groups[action.groupId]
      if (!group) return state
      const ids = [...group.instanceIds]
      if (
        action.fromIndex < 0 ||
        action.fromIndex >= ids.length ||
        action.toIndex < 0 ||
        action.toIndex >= ids.length
      ) {
        return state
      }
      const [moved] = ids.splice(action.fromIndex, 1)
      ids.splice(action.toIndex, 0, moved!)
      const next: PanelsState = {
        ...state,
        groups: { ...state.groups, [action.groupId]: { ...group, instanceIds: ids } },
      }
      return reindexGroup(next, action.groupId)
    }

    case "mount": {
      const inst = state.instances[action.instanceId]
      if (!inst || inst.mounted) return state
      return {
        ...state,
        instances: { ...state.instances, [action.instanceId]: { ...inst, mounted: true } },
      }
    }

    case "unmount": {
      const inst = state.instances[action.instanceId]
      if (!inst || !inst.mounted) return state
      // Never unmount an active panel (invariant).
      if (inst.active) return state
      return {
        ...state,
        instances: {
          ...state.instances,
          [action.instanceId]: { ...inst, mounted: false },
        },
      }
    }

    case "minimize": {
      const inst = state.instances[action.instanceId]
      if (!inst) return state
      const group = state.groups[inst.groupId]
      let next: PanelsState = {
        ...state,
        instances: {
          ...state.instances,
          [action.instanceId]: { ...inst, minimized: true, mounted: false },
        },
      }
      // If it was the active tab, hand active to the next sibling.
      if (group && group.activeInstanceId === action.instanceId) {
        const sibling = group.instanceIds.find((id) => id !== action.instanceId) ?? null
        next = applyActive(next, inst.groupId, sibling)
      }
      return next
    }

    case "restore": {
      const inst = state.instances[action.instanceId]
      if (!inst) return state
      const next: PanelsState = {
        ...state,
        instances: {
          ...state.instances,
          [action.instanceId]: { ...inst, minimized: false },
        },
      }
      return applyActive(next, inst.groupId, action.instanceId)
    }

    case "maximize": {
      const inst = state.instances[action.instanceId]
      if (!inst) return state
      const instances = { ...state.instances }
      // Only one maximized instance per region at a time.
      for (const id of Object.keys(instances)) {
        const other = instances[id]
        if (other && other.region === inst.region && other.maximized) instances[id] = { ...other, maximized: false }
      }
      instances[action.instanceId] = { ...inst, maximized: true }
      return { ...state, instances }
    }

    case "unmaximize": {
      const inst = state.instances[action.instanceId]
      if (!inst || !inst.maximized) return state
      return {
        ...state,
        instances: { ...state.instances, [action.instanceId]: { ...inst, maximized: false } },
      }
    }

    case "setViewState": {
      const inst = state.instances[action.instanceId]
      if (!inst) return state
      return {
        ...state,
        instances: {
          ...state.instances,
          [action.instanceId]: { ...inst, viewState: action.viewState },
        },
      }
    }

    case "setError": {
      const inst = state.instances[action.instanceId]
      if (!inst) return state
      return {
        ...state,
        instances: {
          ...state.instances,
          [action.instanceId]: { ...inst, errorState: action.error },
        },
      }
    }

    default:
      return state
  }
}

export function emptyPanelsState(workspaceId: string): PanelsState {
  return {
    workspaceId,
    instances: {},
    groups: {},
    groupOrder: [],
    hydrated: false,
  }
}

/** Rebuild the runtime model from a persisted blob. */
export function hydrateFromPersisted(
  persisted: PersistedPanels,
  registry: PanelRegistry,
): PanelsState {
  const instances: Record<PanelInstanceId, PanelInstance> = {}
  const groups: Record<string, PanelGroup> = {}
  const groupOrder: string[] = []

  const byGroup = new Map<string, typeof persisted.instances[number][]>()
  for (const pi of persisted.instances) {
    const list = byGroup.get(pi.groupId) ?? []
    list.push(pi)
    byGroup.set(pi.groupId, list)
  }

  for (const pg of persisted.groups) {
    if (!byGroup.has(pg.groupId)) continue
    groups[pg.groupId] = {
      groupId: pg.groupId,
      region: pg.region,
      instanceIds: [],
      activeInstanceId: pg.activeInstanceId,
      sizeFraction: pg.sizeFraction,
    }
    groupOrder.push(pg.groupId)
  }

  for (const [groupId, list] of byGroup) {
    if (!groups[groupId]) {
      const region = list[0]?.region ?? "right"
      groups[groupId] = { groupId, region, instanceIds: [], activeInstanceId: null, sizeFraction: 1 }
      groupOrder.push(groupId)
    }
    const sorted = [...list].sort((a, b) => a.tabIndex - b.tabIndex)
    const ids = sorted.map((pi) => pi.instanceId)
    groups[groupId] = { ...groups[groupId], instanceIds: ids }
    const activeId = groups[groupId].activeInstanceId ?? ids[0] ?? null
    groups[groupId] = { ...groups[groupId], activeInstanceId: activeId }

    sorted.forEach((pi, index) => {
      const desc = registry.tryGet(pi.kind)
      instances[pi.instanceId] = {
        instanceId: pi.instanceId,
        kind: pi.kind,
        region: pi.region,
        groupId,
        tabIndex: index,
        title: desc?.title ?? pi.kind,
        mounted: false,
        active: pi.instanceId === activeId,
        hiddenSinceMs: pi.instanceId === activeId ? null : Date.now(),
        viewState: pi.viewState,
        errorState: null,
        args: pi.args,
        lifecycle: null,
        minimized: false,
        maximized: false,
      }
    })
  }

  return { workspaceId: persisted.workspaceId, instances, groups, groupOrder, hydrated: true }
}

/** Extract the persisted (Tier 1 + view state) shape from the runtime model. */
export function toPersisted(state: PanelsState): PersistedPanels {
  return {
    schemaVersion: 1,
    workspaceId: state.workspaceId,
    instances: Object.values(state.instances).map((inst) => ({
      instanceId: inst.instanceId,
      kind: inst.kind,
      region: inst.region,
      groupId: inst.groupId,
      tabIndex: inst.tabIndex,
      args: inst.args,
      viewState: inst.viewState,
    })),
    groups: Object.values(state.groups).map((g) => ({
      groupId: g.groupId,
      region: g.region,
      activeInstanceId: g.activeInstanceId,
      sizeFraction: g.sizeFraction,
    })),
    updatedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Context + public API
// ---------------------------------------------------------------------------

export interface UsePanelsApi {
  readonly state: PanelsState
  readonly registry: PanelRegistry
  /** Open (or, for singletons, focus the existing) instance of a kind. Returns its id. */
  open(kind: PanelKind, options?: OpenPanelOptions): PanelInstanceId
  /** Close an instance. No-op for a non-closable descriptor. */
  close(instanceId: PanelInstanceId): void
  /** Open if closed (returns id); if a singleton is open, focus + return its id; else no-op close for the given id. */
  toggle(kind: PanelKind, options?: OpenPanelOptions): PanelInstanceId | null
  /** Make an instance the active tab of its group (does not move focus DOM). */
  focus(instanceId: PanelInstanceId): void
  /** Set the active tab of a group. */
  setActive(groupId: string, instanceId: PanelInstanceId): void
  /** Move a tab within its group. */
  reorder(groupId: string, fromIndex: number, toIndex: number): void
  minimize(instanceId: PanelInstanceId): void
  restore(instanceId: PanelInstanceId): void
  maximize(instanceId: PanelInstanceId): void
  unmaximize(instanceId: PanelInstanceId): void
  mount(instanceId: PanelInstanceId): void
  unmount(instanceId: PanelInstanceId): void
  setViewState(instanceId: PanelInstanceId, viewState: unknown): void
  setError(instanceId: PanelInstanceId, error: PanelErrorState | null): void
  /** All open instances in a region, group-ordered. */
  list(region?: PanelRegion): readonly PanelInstance[]
  /** All groups in a region, in insertion order. */
  groupsIn(region: PanelRegion): readonly PanelGroup[]
}

const PanelsContext = createContext<UsePanelsApi | null>(null)

export interface PanelProviderProps {
  readonly workspaceId: string
  readonly registry?: PanelRegistry
  /** How long a hidden tab stays mounted before idle-unmount (Part 01). */
  readonly unmountAfterMs?: number
  /** Skip async load/persist (tests). */
  readonly disablePersistence?: boolean
  readonly children?: ReactNode
}

/** Default idle-unmount timer (Part 01: PANEL_UNMOUNT_AFTER_MS = 300000). */
export const PANEL_UNMOUNT_AFTER_MS = 300_000

export function PanelProvider(props: PanelProviderProps): ReactNode {
  const { workspaceId, children, disablePersistence = false } = props
  const registry = props.registry ?? PANEL_REGISTRY
  const unmountAfterMs = props.unmountAfterMs ?? PANEL_UNMOUNT_AFTER_MS

  const [state, dispatch] = useReducer(panelsReducer, workspaceId, emptyPanelsState)
  const stateRef = useRef(state)
  stateRef.current = state

  const lifecycleCtx = useCallback(
    (inst: PanelInstance): PanelLifecycleContext => ({
      instanceId: inst.instanceId,
      kind: inst.kind,
      region: inst.region,
      args: inst.args,
    }),
    [],
  )

  // Hydrate from persistence on mount / workspace change.
  useEffect(() => {
    let cancelled = false
    if (disablePersistence) {
      dispatch({ type: "hydrate", state: { ...emptyPanelsState(workspaceId), hydrated: true } })
      return () => {
        cancelled = true
      }
    }
    void (async () => {
      const persisted = await loadPanels(workspaceId, registry)
      if (cancelled) return
      const runtime =
        persisted.instances.length > 0
          ? hydrateFromPersisted(persisted, registry)
          : { ...hydrateFromPersisted(buildEmptyPanels(workspaceId), registry), hydrated: true }
      dispatch({ type: "hydrate", state: runtime })
    })()
    return () => {
      cancelled = true
    }
  }, [workspaceId, registry, disablePersistence])

  // Persist on structural change (debounced) once hydrated.
  useEffect(() => {
    if (disablePersistence || !state.hydrated) return
    schedulePersist(toPersisted(state))
  }, [state, disablePersistence])

  // Flush on unmount so nothing is lost.
  useEffect(() => {
    return () => {
      if (!disablePersistence && stateRef.current.hydrated) void flush(toPersisted(stateRef.current))
    }
  }, [disablePersistence])

  // Idle-unmount timer: unmount hidden, non-keepAlive tabs after the window.
  useEffect(() => {
    const timer = setInterval(() => {
      const s = stateRef.current
      const now = Date.now()
      for (const id of Object.keys(s.instances)) {
        const inst = s.instances[id]
        if (!inst || inst.active || !inst.mounted || inst.hiddenSinceMs === null) continue
        const desc = registry.tryGet(inst.kind)
        if (desc?.keepAlive) continue
        if (now - inst.hiddenSinceMs >= unmountAfterMs) {
          desc?.lifecycle?.onUnmount?.(lifecycleCtx(inst))
          inst.lifecycle?.onUnmount?.(lifecycleCtx(inst))
          dispatch({ type: "unmount", instanceId: id })
        }
      }
    }, 1_000)
    return () => clearInterval(timer)
  }, [registry, unmountAfterMs, lifecycleCtx])

  const api = useMemo<UsePanelsApi>(() => {
    const open = (kind: PanelKind, options: OpenPanelOptions = {}): PanelInstanceId => {
      const descriptor = registry.get(kind)
      const current = stateRef.current
      if (descriptor.singleton) {
        const existing = findSingleton(current, kind)
        if (existing) {
          dispatch({ type: "focus", instanceId: existing.instanceId })
          return existing.instanceId
        }
      }
      const instanceId = nextInstanceId(kind)
      dispatch({ type: "open", instanceId, kind, descriptor, options })
      return instanceId
    }

    const close = (instanceId: PanelInstanceId): void => {
      const inst = stateRef.current.instances[instanceId]
      if (!inst) return
      const desc = registry.tryGet(inst.kind)
      if (desc && !desc.closable) return
      desc?.lifecycle?.onHide?.(lifecycleCtx(inst))
      inst.lifecycle?.onHide?.(lifecycleCtx(inst))
      if (inst.mounted) {
        desc?.lifecycle?.onUnmount?.(lifecycleCtx(inst))
        inst.lifecycle?.onUnmount?.(lifecycleCtx(inst))
      }
      dispatch({ type: "close", instanceId })
    }

    const toggle = (kind: PanelKind, options: OpenPanelOptions = {}): PanelInstanceId | null => {
      const descriptor = registry.get(kind)
      const current = stateRef.current
      if (descriptor.singleton) {
        const existing = findSingleton(current, kind)
        if (existing) {
          if (descriptor.closable) {
            close(existing.instanceId)
            return null
          }
          dispatch({ type: "focus", instanceId: existing.instanceId })
          return existing.instanceId
        }
      }
      return open(kind, options)
    }

    return {
      state,
      registry,
      open,
      close,
      toggle,
      focus: (instanceId) => dispatch({ type: "focus", instanceId }),
      setActive: (groupId, instanceId) => dispatch({ type: "setActive", groupId, instanceId }),
      reorder: (groupId, fromIndex, toIndex) => dispatch({ type: "reorder", groupId, fromIndex, toIndex }),
      minimize: (instanceId) => dispatch({ type: "minimize", instanceId }),
      restore: (instanceId) => dispatch({ type: "restore", instanceId }),
      maximize: (instanceId) => dispatch({ type: "maximize", instanceId }),
      unmaximize: (instanceId) => dispatch({ type: "unmaximize", instanceId }),
      mount: (instanceId) => dispatch({ type: "mount", instanceId }),
      unmount: (instanceId) => dispatch({ type: "unmount", instanceId }),
      setViewState: (instanceId, viewState) => dispatch({ type: "setViewState", instanceId, viewState }),
      setError: (instanceId, error) => dispatch({ type: "setError", instanceId, error }),
      list: (region) => {
        const all = Object.values(state.instances)
        const filtered = region ? all.filter((i) => i.region === region) : all
        return filtered.sort((a, b) => a.groupId.localeCompare(b.groupId) || a.tabIndex - b.tabIndex)
      },
      groupsIn: (region) =>
        state.groupOrder.map((id) => state.groups[id]).filter((g): g is PanelGroup => !!g && g.region === region),
    }
  }, [state, registry, lifecycleCtx])

  return createElement(PanelsContext.Provider, { value: api }, children)
}

/** Read the panel controller. Throws outside a `PanelProvider`. */
export function usePanels(): UsePanelsApi {
  const ctx = useContext(PanelsContext)
  if (!ctx) throw new Error("usePanels must be used within a <PanelProvider>")
  return ctx
}
