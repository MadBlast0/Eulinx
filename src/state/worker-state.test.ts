/* eslint-disable no-non-null-assertion */
/**
 * P04-STATE-WORKER — Worker State Tests
 */

import { describe, it, expect } from "vitest"
import type { WorkerId, WorkspaceId } from "@/core/types"
import {
  canWorkerTransition,
  createPersistedWorkerState,
  transitionWorkerState,
  updateWorkerMetrics,
  updateWorkerProgress,
  addWorkerArtifact,
  validateWorkerState,
} from "./worker-state"

function wid(id: string): WorkerId { return id as unknown as WorkerId }
function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }

describe("canWorkerTransition", () => {
  it("allows created -> initializing", () => {
    expect(canWorkerTransition("created", "initializing")).toBe(true)
  })
  it("allows initializing -> idle", () => {
    expect(canWorkerTransition("initializing", "idle")).toBe(true)
  })
  it("allows working -> reviewing", () => {
    expect(canWorkerTransition("working", "reviewing")).toBe(true)
  })
  it("allows working -> completed", () => {
    expect(canWorkerTransition("working", "completed")).toBe(true)
  })
  it("rejects created -> working", () => {
    expect(canWorkerTransition("created", "working")).toBe(false)
  })
  it("rejects completed -> working", () => {
    expect(canWorkerTransition("completed", "working")).toBe(false)
  })
})

describe("createPersistedWorkerState", () => {
  it("creates initial worker state", () => {
    const state = createPersistedWorkerState(wid("w_1"), ws("ws_1"), "proj_1")
    expect(state.id).toBe("w_1")
    expect(state.state).toBe("created")
    expect(state.seq).toBe(1)
    expect(state.refinementMode).toBe("medium")
    expect(state.artifactIds).toEqual([])
    expect(state.metrics.totalTokens).toBe(0)
  })
  it("accepts options", () => {
    const state = createPersistedWorkerState(wid("w_1"), ws("ws_1"), "proj_1", {
      parentWorkerId: wid("w_parent"),
      provider: "openai",
      model: "gpt-4",
      refinementMode: "high",
    })
    expect(state.parentWorkerId).toBe("w_parent")
    expect(state.provider).toBe("openai")
    expect(state.model).toBe("gpt-4")
    expect(state.refinementMode).toBe("high")
  })
})

describe("transitionWorkerState", () => {
  it("transitions and bumps seq", () => {
    const initial = createPersistedWorkerState(wid("w_1"), ws("ws_1"), "proj_1")
    const next = transitionWorkerState(initial, "initializing", "Boot")
    expect(next.state).toBe("initializing")
    expect(next.seq).toBe(2)
  })
  it("throws on invalid transition", () => {
    const initial = createPersistedWorkerState(wid("w_1"), ws("ws_1"), "proj_1")
    expect(() => transitionWorkerState(initial, "working", "Bad")).toThrow("Invalid worker transition")
  })
})

describe("updateWorkerMetrics", () => {
  it("merges metrics", () => {
    const state = createPersistedWorkerState(wid("w_1"), ws("ws_1"), "proj_1")
    const updated = updateWorkerMetrics(state, { totalTokens: 1000, totalCostMicroUsd: 50 })
    expect(updated.metrics.totalTokens).toBe(1000)
    expect(updated.metrics.totalCostMicroUsd).toBe(50)
    expect(updated.metrics.executionCount).toBe(0)
  })
})

describe("updateWorkerProgress", () => {
  it("sets progress", () => {
    const state = createPersistedWorkerState(wid("w_1"), ws("ws_1"), "proj_1")
    const updated = updateWorkerProgress(state, 50 as import("@/core/types").Percentage)
    expect(updated.progress).toBe(50)
  })
})

describe("addWorkerArtifact", () => {
  it("adds artifact id", () => {
    const state = createPersistedWorkerState(wid("w_1"), ws("ws_1"), "proj_1")
    const updated = addWorkerArtifact(state, "art_1")
    expect(updated.artifactIds).toEqual(["art_1"])
  })
  it("deduplicates", () => {
    const state = createPersistedWorkerState(wid("w_1"), ws("ws_1"), "proj_1")
    const updated = addWorkerArtifact(addWorkerArtifact(state, "art_1"), "art_1")
    expect(updated.artifactIds).toEqual(["art_1"])
  })
})

describe("validateWorkerState", () => {
  it("returns no errors for valid state", () => {
    const state = createPersistedWorkerState(wid("w_1"), ws("ws_1"), "proj_1")
    expect(validateWorkerState(state)).toEqual([])
  })
  it("catches negative tokens", () => {
    const state = createPersistedWorkerState(wid("w_1"), ws("ws_1"), "proj_1")
    const modified = { ...state, metrics: { ...state.metrics, totalTokens: -1 } }
    const errors = validateWorkerState(modified)
    expect(errors).toContain("Total tokens must be >= 0")
  })
})
