/* eslint-disable no-non-null-assertion */
/**
 * P04-STATE-RUNTIME — Runtime State Tests
 */

import { describe, it, expect } from "vitest"
import type { WorkspaceId, IsoTimestamp } from "@/core/types"
import type { RuntimeState } from "@/runtime/runtime-state"
import type { PersistedRuntimeState } from "./runtime-state"
import {
  canRuntimeTransition,
  getRuntimeTransitions,
  createPersistedRuntimeState,
  transitionRuntimeState,
  validateRuntimeState,
} from "./runtime-state"

function ws(id: string): WorkspaceId {
  return id as unknown as WorkspaceId
}

function ts(iso: string): IsoTimestamp {
  return iso as IsoTimestamp
}

describe("canRuntimeTransition", () => {
  it("allows valid transitions", () => {
    expect(canRuntimeTransition("uninitialized", "starting")).toBe(true)
    expect(canRuntimeTransition("starting", "ready")).toBe(true)
    expect(canRuntimeTransition("ready", "running")).toBe(true)
    expect(canRuntimeTransition("running", "paused")).toBe(true)
    expect(canRuntimeTransition("paused", "running")).toBe(true)
    expect(canRuntimeTransition("running", "degraded")).toBe(true)
    expect(canRuntimeTransition("degraded", "running")).toBe(true)
    expect(canRuntimeTransition("running", "stopping")).toBe(true)
    expect(canRuntimeTransition("stopping", "stopped")).toBe(true)
    expect(canRuntimeTransition("stopped", "starting")).toBe(true)
    expect(canRuntimeTransition("running", "failed")).toBe(true)
    expect(canRuntimeTransition("failed", "recovery")).toBe(true)
    expect(canRuntimeTransition("recovery", "running")).toBe(true)
  })

  it("rejects invalid transitions", () => {
    expect(canRuntimeTransition("uninitialized", "running")).toBe(false)
    expect(canRuntimeTransition("stopped", "running")).toBe(false)
    expect(canRuntimeTransition("failed", "running")).toBe(false)
    expect(canRuntimeTransition("starting", "stopped")).toBe(false)
  })

  it("returns false for unknown states", () => {
    expect(canRuntimeTransition("uninitialized" as RuntimeState, "unknown" as RuntimeState)).toBe(false)
  })
})

describe("getRuntimeTransitions", () => {
  it("returns transitions for known states", () => {
    const transitions = getRuntimeTransitions("running")
    expect(transitions).toContain("paused")
    expect(transitions).toContain("degraded")
    expect(transitions).toContain("stopping")
    expect(transitions).toContain("failed")
    expect(transitions).toContain("recovery")
  })

  it("returns empty for terminal states", () => {
    const transitions = getRuntimeTransitions("stopped")
    expect(transitions).toContain("starting")
  })
})

describe("createPersistedRuntimeState", () => {
  it("creates initial state", () => {
    const state = createPersistedRuntimeState("rt_1", ws("ws_1"), "1.0.0", ts("2025-01-01T00:00:00.000Z"))
    expect(state.id).toBe("rt_1")
    expect(state.workspaceId).toBe("ws_1")
    expect(state.state).toBe("uninitialized")
    expect(state.seq).toBe(1)
    expect(state.health).toBe("healthy")
    expect(state.activeSessionIds).toEqual([])
    expect(state.activeWorkerCount).toBe(0)
  })
})

describe("transitionRuntimeState", () => {
  it("transitions to valid state", () => {
    const initial = createPersistedRuntimeState("rt_1", ws("ws_1"), "1.0.0", ts("2025-01-01T00:00:00.000Z"))
    const next = transitionRuntimeState(initial, "starting", "Boot")
    expect(next.state).toBe("starting")
    expect(next.seq).toBe(2)
  })

  it("throws on invalid transition", () => {
    const initial = createPersistedRuntimeState("rt_1", ws("ws_1"), "1.0.0", ts("2025-01-01T00:00:00.000Z"))
    expect(() => transitionRuntimeState(initial, "running", "Bad")).toThrow("Invalid runtime transition")
  })

  it("bumps seq on each transition", () => {
    let state = createPersistedRuntimeState("rt_1", ws("ws_1"), "1.0.0", ts("2025-01-01T00:00:00.000Z"))
    state = transitionRuntimeState(state, "starting", "Boot")
    state = transitionRuntimeState(state, "ready", "Ready")
    state = transitionRuntimeState(state, "running", "Go")
    expect(state.seq).toBe(4)
  })
})

describe("validateRuntimeState", () => {
  it("returns no errors for valid state", () => {
    const state = createPersistedRuntimeState("rt_1", ws("ws_1"), "1.0.0", ts("2025-01-01T00:00:00.000Z"))
    expect(validateRuntimeState(state)).toEqual([])
  })

  it("catches negative worker count", () => {
    const state = createPersistedRuntimeState("rt_1", ws("ws_1"), "1.0.0", ts("2025-01-01T00:00:00.000Z"))
    const modified = { ...state, activeWorkerCount: -1 } as PersistedRuntimeState
    const errors = validateRuntimeState(modified)
    expect(errors).toContain("Active worker count must be >= 0")
  })

  it("requires lastError when health is failed", () => {
    const state = createPersistedRuntimeState("rt_1", ws("ws_1"), "1.0.0", ts("2025-01-01T00:00:00.000Z"))
    const modified = { ...state, health: "failed" as const } as PersistedRuntimeState
    const errors = validateRuntimeState(modified)
    expect(errors).toContain("Failed runtime must have lastError")
  })
})
