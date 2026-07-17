/* eslint-disable no-non-null-assertion */
/**
 * P04-STATE-SESSION — Session State Tests
 */

import { describe, it, expect } from "vitest"
import type { SessionId, WorkspaceId, WorkerId } from "@/core/types"
import {
  canSessionTransition,
  SESSION_TERMINAL,
  SESSION_ACTIVE,
  createPersistedSessionState,
  transitionSessionState,
  addSessionWorker,
  removeSessionWorker,
  updateSessionMetrics,
  validateSessionState,
} from "./session-state"

function sid(id: string): SessionId { return id as unknown as SessionId }
function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }
function wid(id: string): WorkerId { return id as unknown as WorkerId }

describe("canSessionTransition", () => {
  it("allows created -> initializing", () => {
    expect(canSessionTransition("created", "initializing")).toBe(true)
  })
  it("allows running -> paused", () => {
    expect(canSessionTransition("running", "paused")).toBe(true)
  })
  it("allows running -> completing", () => {
    expect(canSessionTransition("running", "completing")).toBe(true)
  })
  it("allows paused -> resumed", () => {
    expect(canSessionTransition("paused", "resumed")).toBe(true)
  })
  it("rejects created -> running", () => {
    expect(canSessionTransition("created", "running")).toBe(false)
  })
  it("rejects completed -> running", () => {
    expect(canSessionTransition("completed", "running")).toBe(false)
  })
})

describe("SESSION_TERMINAL", () => {
  it("contains terminal states", () => {
    expect(SESSION_TERMINAL).toContain("completed")
    expect(SESSION_TERMINAL).toContain("archived")
    expect(SESSION_TERMINAL).toContain("failed")
    expect(SESSION_TERMINAL).toContain("cancelled")
  })
})

describe("SESSION_ACTIVE", () => {
  it("contains active states", () => {
    expect(SESSION_ACTIVE).toContain("running")
    expect(SESSION_ACTIVE).toContain("initializing")
    expect(SESSION_ACTIVE).toContain("recovering")
  })
})

describe("createPersistedSessionState", () => {
  it("creates initial session", () => {
    const state = createPersistedSessionState(sid("s_1"), ws("ws_1"), "rt_1")
    expect(state.id).toBe("s_1")
    expect(state.state).toBe("created")
    expect(state.seq).toBe(1)
    expect(state.kind).toBe("chat")
    expect(state.activeWorkerIds).toEqual([])
  })
})

describe("transitionSessionState", () => {
  it("transitions and bumps seq", () => {
    const initial = createPersistedSessionState(sid("s_1"), ws("ws_1"), "rt_1")
    const next = transitionSessionState(initial, "initializing", "Boot")
    expect(next.state).toBe("initializing")
    expect(next.seq).toBe(2)
  })
  it("sets endedAt on terminal states", () => {
    let state = createPersistedSessionState(sid("s_1"), ws("ws_1"), "rt_1")
    state = transitionSessionState(state, "initializing", "Boot")
    state = transitionSessionState(state, "loading_workspace", "Load")
    state = transitionSessionState(state, "starting_services", "Start")
    state = transitionSessionState(state, "running", "Go")
    state = transitionSessionState(state, "completing", "Done")
    state = transitionSessionState(state, "completed", "Done")
    expect(state.endedAt).toBeTruthy()
  })
  it("throws on invalid transition", () => {
    const initial = createPersistedSessionState(sid("s_1"), ws("ws_1"), "rt_1")
    expect(() => transitionSessionState(initial, "running", "Bad")).toThrow("Invalid session transition")
  })
})

describe("addSessionWorker", () => {
  it("adds worker id", () => {
    const state = createPersistedSessionState(sid("s_1"), ws("ws_1"), "rt_1")
    const updated = addSessionWorker(state, wid("w_1"))
    expect(updated.activeWorkerIds).toEqual(["w_1"])
  })
  it("deduplicates", () => {
    const state = createPersistedSessionState(sid("s_1"), ws("ws_1"), "rt_1")
    const updated = addSessionWorker(addSessionWorker(state, wid("w_1")), wid("w_1"))
    expect(updated.activeWorkerIds).toEqual(["w_1"])
  })
})

describe("removeSessionWorker", () => {
  it("removes worker id", () => {
    const state = createPersistedSessionState(sid("s_1"), ws("ws_1"), "rt_1")
    const withWorker = addSessionWorker(state, wid("w_1"))
    const removed = removeSessionWorker(withWorker, wid("w_1"))
    expect(removed.activeWorkerIds).toEqual([])
  })
  it("no-op if not present", () => {
    const state = createPersistedSessionState(sid("s_1"), ws("ws_1"), "rt_1")
    const removed = removeSessionWorker(state, wid("w_1"))
    expect(removed.activeWorkerIds).toEqual([])
  })
})

describe("updateSessionMetrics", () => {
  it("merges metrics", () => {
    const state = createPersistedSessionState(sid("s_1"), ws("ws_1"), "rt_1")
    const updated = updateSessionMetrics(state, { totalWorkersSpawned: 5 })
    expect(updated.metrics.totalWorkersSpawned).toBe(5)
    expect(updated.metrics.totalCostMicroUsd).toBe(0)
  })
})

describe("validateSessionState", () => {
  it("returns no errors for valid state", () => {
    const state = createPersistedSessionState(sid("s_1"), ws("ws_1"), "rt_1")
    expect(validateSessionState(state)).toEqual([])
  })
  it("requires endedAt for terminal states", () => {
    const state = createPersistedSessionState(sid("s_1"), ws("ws_1"), "rt_1")
    const modified = { ...state, state: "completed" as const, endedAt: undefined }
    const errors = validateSessionState(modified)
    expect(errors).toContain("Terminal session must have endedAt")
  })
})
