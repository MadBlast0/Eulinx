/**
 * Panels — test suite (Panels-Part01..06).
 *
 * Covers:
 *  - registry add / lookup / duplicate / freeze / allowlist validation;
 *  - reducer lazy mount + idle-unmount behavior (state machine invariants);
 *  - tab reorder;
 *  - persistence round-trip (hydrate <-> toPersisted, unknown-kind drop,
 *    fraction renormalization) with a mocked store.
 */

import { describe, it, expect } from "vitest"
import { createElement, type ReactNode } from "react"
import {
  createPanelRegistry,
  PanelRegistryError,
  type PanelDescriptor,
  type PanelProps,
} from "./panels-registry"
import {
  panelsReducer,
  emptyPanelsState,
  hydrateFromPersisted,
  toPersisted,
  defaultGroupId,
  nextInstanceId,
  type PanelsState,
} from "./use-panels"
import { validateAndRepair, buildEmptyPanels, migrate } from "./panel-store-adapter"

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function StubComponent(_props: PanelProps): ReactNode {
  return createElement("div")
}

function makeDescriptor(kind: string, over: Partial<PanelDescriptor> = {}): PanelDescriptor {
  return {
    kind,
    title: kind[0]!.toUpperCase() + kind.slice(1),
    icon: "domain.panel",
    defaultRegion: "right",
    singleton: false,
    minWidthToken: "var(--Eulinx-space-16)",
    minHeightToken: "var(--Eulinx-space-16)",
    maxWidthToken: null,
    component: StubComponent,
    dataSource: { commands: [], events: [], pollIntervalMs: null },
    closable: true,
    reorderable: true,
    defaultOpen: false,
    ...over,
  }
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

describe("PanelRegistry", () => {
  it("registers and looks up a descriptor", () => {
    const reg = createPanelRegistry()
    const d = makeDescriptor("inspector")
    reg.register(d)
    expect(reg.has("inspector")).toBe(true)
    expect(reg.get("inspector")).toBe(d)
    expect(reg.tryGet("inspector")).toBe(d)
    expect(reg.tryGet("missing")).toBeNull()
  })

  it("throws on a duplicate kind", () => {
    const reg = createPanelRegistry()
    reg.register(makeDescriptor("logs"))
    try {
      reg.register(makeDescriptor("logs"))
      expect.unreachable("expected duplicate_kind throw")
    } catch (e) {
      expect(e).toBeInstanceOf(PanelRegistryError)
      expect((e as PanelRegistryError).kind).toBe("duplicate_kind")
    }
  })

  it("throws unknown_kind on get of an absent kind", () => {
    const reg = createPanelRegistry()
    expect(() => reg.get("nope")).toThrowError(PanelRegistryError)
  })

  it("throws once frozen", () => {
    const reg = createPanelRegistry()
    reg.register(makeDescriptor("a"))
    reg.freeze()
    expect(reg.isFrozen()).toBe(true)
    try {
      reg.register(makeDescriptor("b"))
      expect.unreachable("expected registry_frozen throw")
    } catch (e) {
      expect((e as PanelRegistryError).kind).toBe("registry_frozen")
    }
  })

  it("rejects a command not in the IPC allowlist", () => {
    const reg = createPanelRegistry()
    const bad = makeDescriptor("bad", {
      dataSource: { commands: ["definitely_not_allowed"], events: [], pollIntervalMs: null },
    })
    expect(() => reg.register(bad)).toThrowError(/allowlist/)
  })

  it("rejects an event not starting with Eulinx://", () => {
    const reg = createPanelRegistry()
    const bad = makeDescriptor("bad", {
      dataSource: { commands: [], events: ["some.event"], pollIntervalMs: null },
    })
    expect(() => reg.register(bad)).toThrowError(/Eulinx/)
  })

  it("preserves registration order in all() and filters by region", () => {
    const reg = createPanelRegistry()
    reg.register(makeDescriptor("one", { defaultRegion: "left" }))
    reg.register(makeDescriptor("two", { defaultRegion: "right" }))
    reg.register(makeDescriptor("three", { defaultRegion: "left" }))
    expect(reg.all().map((d) => d.kind)).toEqual(["one", "two", "three"])
    expect(reg.byDefaultRegion("left").map((d) => d.kind)).toEqual(["one", "three"])
  })
})

// ---------------------------------------------------------------------------
// Reducer — lazy mount / unmount / invariants
// ---------------------------------------------------------------------------

describe("panelsReducer — lazy mount & state machine", () => {
  const reg = createPanelRegistry()
  reg.register(makeDescriptor("inspector"))
  reg.register(makeDescriptor("logs"))

  function open(state: PanelsState, kind: string): { state: PanelsState; id: string } {
    const id = nextInstanceId(kind)
    const descriptor = reg.get(kind)
    const next = panelsReducer(state, { type: "open", instanceId: id, kind, descriptor, options: {} })
    return { state: next, id }
  }

  it("an opened panel is active but NOT yet mounted (lazy)", () => {
    let s = emptyPanelsState("ws")
    const o = open(s, "inspector")
    s = o.state
    const inst = s.instances[o.id]!
    expect(inst!.active).toBe(true)
    expect(inst!.mounted).toBe(false)
    expect(inst!.hiddenSinceMs).toBeNull()
  })

  it("mount sets mounted; second tab activation hides the first and starts its idle timer", () => {
    let s = emptyPanelsState("ws")
    const a = open(s, "inspector")
    s = a.state
    s = panelsReducer(s, { type: "mount", instanceId: a.id })
    expect(s.instances[a.id]!.mounted).toBe(true)

    const b = open(s, "logs")
    s = b.state // opens into same default group -> becomes active
    expect(s.instances[b.id]!.active).toBe(true)
    expect(s.instances[a.id]!.active).toBe(false)
    // hidden but still mounted, timer counting
    expect(s.instances[a.id]!.mounted).toBe(true)
    expect(typeof s.instances[a.id]!.hiddenSinceMs).toBe("number")
  })

  it("never unmounts an active panel (invariant)", () => {
    let s = emptyPanelsState("ws")
    const a = open(s, "inspector")
    s = a.state
    s = panelsReducer(s, { type: "mount", instanceId: a.id })
    // attempt to unmount the active tab
    s = panelsReducer(s, { type: "unmount", instanceId: a.id })
    expect(s.instances[a.id]!.mounted).toBe(true)
  })

  it("unmounts a hidden tab, preserving viewState", () => {
    let s = emptyPanelsState("ws")
    const a = open(s, "inspector")
    s = a.state
    s = panelsReducer(s, { type: "mount", instanceId: a.id })
    s = panelsReducer(s, { type: "setViewState", instanceId: a.id, viewState: { scrollTop: 4000 } })
    const b = open(s, "logs")
    s = b.state
    s = panelsReducer(s, { type: "unmount", instanceId: a.id })
    expect(s.instances[a.id]!.mounted).toBe(false)
    expect(s.instances[a.id]!.viewState).toEqual({ scrollTop: 4000 })
  })

  it("deletes a group in the same commit that empties it", () => {
    let s = emptyPanelsState("ws")
    const a = open(s, "inspector")
    s = a.state
    const gid = defaultGroupId("right")
    expect(s.groups[gid]).toBeDefined()
    s = panelsReducer(s, { type: "close", instanceId: a.id })
    expect(s.groups[gid]).toBeUndefined()
    expect(s.groupOrder).not.toContain(gid)
  })
})

// ---------------------------------------------------------------------------
// Reducer — tab reorder
// ---------------------------------------------------------------------------

describe("panelsReducer — tab reorder", () => {
  const reg = createPanelRegistry()
  reg.register(makeDescriptor("a"))
  reg.register(makeDescriptor("b"))
  reg.register(makeDescriptor("c"))

  it("moves a tab and reindexes tabIndex", () => {
    let s = emptyPanelsState("ws")
    const ids: string[] = []
    for (const kind of ["a", "b", "c"]) {
      const id = nextInstanceId(kind)
      ids.push(id)
      s = panelsReducer(s, { type: "open", instanceId: id, kind, descriptor: reg.get(kind), options: {} })
    }
    const gid = defaultGroupId("right")
    expect(s.groups[gid]!.instanceIds).toEqual(ids)

    // move first to last
    s = panelsReducer(s, { type: "reorder", groupId: gid, fromIndex: 0, toIndex: 2 })
    expect(s.groups[gid]!.instanceIds).toEqual([ids[1]!, ids[2]!, ids[0]!])
    expect(s.instances[ids[0]!]!.tabIndex).toBe(2)
    expect(s.instances[ids[1]!]!.tabIndex).toBe(0)
  })

  it("ignores out-of-range reorder", () => {
    let s = emptyPanelsState("ws")
    const id = nextInstanceId("a")
    s = panelsReducer(s, { type: "open", instanceId: id, kind: "a", descriptor: reg.get("a"), options: {} })
    const gid = defaultGroupId("right")
    const before = s.groups[gid]!.instanceIds
    s = panelsReducer(s, { type: "reorder", groupId: gid, fromIndex: 5, toIndex: 9 })
    expect(s.groups[gid]!.instanceIds).toEqual(before)
  })
})

// ---------------------------------------------------------------------------
// Persistence round-trip
// ---------------------------------------------------------------------------

describe("persistence round-trip", () => {
  const reg = createPanelRegistry()
  reg.register(makeDescriptor("inspector"))
  reg.register(makeDescriptor("logs"))

  it("toPersisted then hydrateFromPersisted preserves arrangement + viewState", () => {
    let s = emptyPanelsState("ws-1")
    const insp = nextInstanceId("inspector")
    s = panelsReducer(s, {
      type: "open",
      instanceId: insp,
      kind: "inspector",
      descriptor: reg.get("inspector"),
      options: { args: { workerId: "w_1" } },
    })
    s = panelsReducer(s, { type: "setViewState", instanceId: insp, viewState: { scrollTop: 120 } })
    const logs = nextInstanceId("logs")
    s = panelsReducer(s, {
      type: "open",
      instanceId: logs,
      kind: "logs",
      descriptor: reg.get("logs"),
      options: { region: "bottom" },
    })

    const persisted = toPersisted(s)
    expect(persisted.workspaceId).toBe("ws-1")
    expect(persisted.instances).toHaveLength(2)

    const rehydrated = hydrateFromPersisted(persisted, reg)
    expect(Object.keys(rehydrated.instances)).toHaveLength(2)
    expect(rehydrated.instances[insp]!.args.workerId).toBe("w_1")
    expect(rehydrated.instances[insp]!.viewState).toEqual({ scrollTop: 120 })
    // hydrated panels start unmounted (lazy)
    expect(rehydrated.instances[insp]!.mounted).toBe(false)
  })

  it("validateAndRepair drops instances of unknown kinds", () => {
    const blob = {
      schemaVersion: 1,
      workspaceId: "ws",
      instances: [
        { instanceId: "pi_1", kind: "inspector", region: "right", groupId: "g", tabIndex: 0, args: {}, viewState: null },
        { instanceId: "pi_2", kind: "ghost_kind", region: "right", groupId: "g", tabIndex: 1, args: {}, viewState: null },
      ],
      groups: [{ groupId: "g", region: "right", activeInstanceId: "pi_2", sizeFraction: 1 }],
      updatedAt: "now",
    }
    const repaired = validateAndRepair(blob, "ws", reg)
    expect(repaired.instances.map((i) => i.instanceId)).toEqual(["pi_1"])
    // dangling active pointer (pi_2 was dropped) is backfilled to a live member
    expect(repaired.groups[0]!.activeInstanceId).toBe("pi_1")
  })

  it("validateAndRepair renormalizes fractions per region to sum to 1", () => {
    const blob = {
      schemaVersion: 1,
      workspaceId: "ws",
      instances: [
        { instanceId: "pi_1", kind: "inspector", region: "bottom", groupId: "g1", tabIndex: 0, args: {}, viewState: null },
        { instanceId: "pi_2", kind: "logs", region: "bottom", groupId: "g2", tabIndex: 0, args: {}, viewState: null },
      ],
      groups: [
        { groupId: "g1", region: "bottom", activeInstanceId: "pi_1", sizeFraction: 2 },
        { groupId: "g2", region: "bottom", activeInstanceId: "pi_2", sizeFraction: 2 },
      ],
      updatedAt: "now",
    }
    const repaired = validateAndRepair(blob, "ws", reg)
    const total = repaired.groups.reduce((sum, g) => sum + g.sizeFraction, 0)
    expect(total).toBeCloseTo(1, 5)
  })

  it("migrate returns null for a from-the-future schema (falls back)", () => {
    expect(migrate({ schemaVersion: 999 })).toBeNull()
  })

  it("buildEmptyPanels yields an empty, versioned blob", () => {
    const empty = buildEmptyPanels("ws")
    expect(empty.instances).toHaveLength(0)
    expect(empty.groups).toHaveLength(0)
    expect(empty.schemaVersion).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Singleton enforcement via validateAndRepair
// ---------------------------------------------------------------------------

describe("singleton enforcement", () => {
  it("keeps at most one instance of a singleton kind", () => {
    const reg = createPanelRegistry()
    reg.register(makeDescriptor("permissions", { singleton: true }))
    const blob = {
      schemaVersion: 1,
      workspaceId: "ws",
      instances: [
        { instanceId: "pi_1", kind: "permissions", region: "right", groupId: "g", tabIndex: 0, args: {}, viewState: null },
        { instanceId: "pi_2", kind: "permissions", region: "right", groupId: "g", tabIndex: 1, args: {}, viewState: null },
      ],
      groups: [{ groupId: "g", region: "right", activeInstanceId: "pi_1", sizeFraction: 1 }],
      updatedAt: "now",
    }
    const repaired = validateAndRepair(blob, "ws", reg)
    expect(repaired.instances).toHaveLength(1)
    expect(repaired.instances[0]!.instanceId).toBe("pi_1")
  })
})
