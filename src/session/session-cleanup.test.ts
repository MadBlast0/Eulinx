/**
 * P07-SESSION-CLEANUP — Session Cleanup Tests
 */

import { describe, it, expect } from "vitest"
import type { SessionId, WorkerId } from "@/core/types"
import type { PersistedSessionState } from "@/state/session-state"
import {
  buildSessionCleanupPlan,
  executeSessionCleanup,
  isSessionCleanedUp,
} from "./session-cleanup"

function sid(id: string): SessionId { return id as unknown as SessionId }
function wid(id: string): WorkerId { return id as unknown as WorkerId }

function mockState(overrides?: Partial<PersistedSessionState>): PersistedSessionState {
  const now = new Date().toISOString()
  return {
    id: sid("ses_1"),
    workspaceId: "ws_1" as any,
    runtimeId: "rt_1",
    kind: "chat",
    state: "completed",
    seq: 5,
    activeWorkerIds: [wid("w_1")],
    activeTaskIds: [],
    artifactIds: ["art_1"],
    metrics: {
      totalWorkersSpawned: 1,
      totalTasksExecuted: 0,
      totalArtifactsCreated: 1,
      totalTokensUsed: 0,
      totalCostMicroUsd: 0,
      totalDurationMs: 0,
      errorCount: 0,
    },
    startedAt: now as any,
    endedAt: now as any,
    lastPersistedAt: now as any,
    metadata: {
      createdAt: now as any,
      updatedAt: now as any,
      version: 1,
      checksum: "",
    },
    ...overrides,
  }
}

describe("buildSessionCleanupPlan", () => {
  it("includes terminate_workers when workers are active", () => {
    const state = mockState()
    const plan = buildSessionCleanupPlan(state)
    expect(plan.some(a => a.kind === "terminate_workers")).toBe(true)
  })

  it("excludes terminate_workers when no workers", () => {
    const state = mockState({ activeWorkerIds: [] })
    const plan = buildSessionCleanupPlan(state)
    expect(plan.some(a => a.kind === "terminate_workers")).toBe(false)
  })

  it("includes archive_artifacts when artifacts exist", () => {
    const state = mockState()
    const plan = buildSessionCleanupPlan(state)
    expect(plan.some(a => a.kind === "archive_artifacts")).toBe(true)
  })

  it("all actions are idempotent", () => {
    const state = mockState()
    const plan = buildSessionCleanupPlan(state)
    for (const action of plan) {
      expect(action.idempotent).toBe(true)
    }
  })
})

describe("executeSessionCleanup", () => {
  it("executes all actions successfully", async () => {
    const state = mockState()
    const result = await executeSessionCleanup(state, async () => true)

    expect(result.success).toBe(true)
    expect(result.actionsFailed).toEqual([])
    expect(result.actionsExecuted.length).toBeGreaterThan(0)
    expect(result.sessionId).toBe("ses_1")
  })

  it("tracks failed required actions", async () => {
    const state = mockState()
    const result = await executeSessionCleanup(state, async (action) => {
      if (action.kind === "release_locks") return false
      return true
    })

    expect(result.success).toBe(false)
    expect(result.actionsFailed).toContain("release_locks")
  })
})

describe("isSessionCleanedUp", () => {
  it("returns true for terminal state with no workers", () => {
    const state = mockState({ activeWorkerIds: [] })
    expect(isSessionCleanedUp(state)).toBe(true)
  })

  it("returns false when workers still active", () => {
    const state = mockState()
    expect(isSessionCleanedUp(state)).toBe(false)
  })

  it("returns false for non-terminal state", () => {
    const state = mockState({ state: "running" as any, activeWorkerIds: [] })
    expect(isSessionCleanedUp(state)).toBe(false)
  })
})
