/* eslint-disable no-non-null-assertion */
/**
 * P04-STATE-TASK — Task State Tests
 */

import { describe, it, expect } from "vitest"
import type { TaskId, WorkerId, WorkspaceId } from "@/core/types"
import {
  canTaskTransition,
  TASK_TERMINAL,
  TASK_ACTIVE,
  createPersistedTaskState,
  transitionTaskState,
  assignTask,
  updateTaskProgress,
  blockTask,
  unblockTask,
  addTaskArtifact,
  validateTaskState,
} from "./task-state"

function tid(id: string): TaskId { return id as unknown as TaskId }
function wid(id: string): WorkerId { return id as unknown as WorkerId }
function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }

describe("canTaskTransition", () => {
  it("allows created -> validated", () => {
    expect(canTaskTransition("created", "validated")).toBe(true)
  })
  it("allows validated -> ready", () => {
    expect(canTaskTransition("validated", "ready")).toBe(true)
  })
  it("allows ready -> assigned", () => {
    expect(canTaskTransition("ready", "assigned")).toBe(true)
  })
  it("allows assigned -> running", () => {
    expect(canTaskTransition("assigned", "running")).toBe(true)
  })
  it("allows running -> reviewing", () => {
    expect(canTaskTransition("running", "reviewing")).toBe(true)
  })
  it("allows reviewing -> verified", () => {
    expect(canTaskTransition("reviewing", "verified")).toBe(true)
  })
  it("allows verified -> completed", () => {
    expect(canTaskTransition("verified", "completed")).toBe(true)
  })
  it("allows running -> failed", () => {
    expect(canTaskTransition("running", "failed")).toBe(true)
  })
  it("allows failed -> retrying", () => {
    expect(canTaskTransition("failed", "retrying")).toBe(true)
  })
  it("allows retrying -> running", () => {
    expect(canTaskTransition("retrying", "running")).toBe(true)
  })
  it("allows running -> blocked", () => {
    expect(canTaskTransition("running", "blocked")).toBe(true)
  })
  it("allows blocked -> ready", () => {
    expect(canTaskTransition("blocked", "ready")).toBe(true)
  })
  it("rejects created -> running", () => {
    expect(canTaskTransition("created", "running")).toBe(false)
  })
  it("rejects completed -> running", () => {
    expect(canTaskTransition("completed", "running")).toBe(false)
  })
})

describe("TASK_TERMINAL", () => {
  it("contains terminal states", () => {
    expect(TASK_TERMINAL).toContain("completed")
    expect(TASK_TERMINAL).toContain("failed")
    expect(TASK_TERMINAL).toContain("cancelled")
  })
})

describe("TASK_ACTIVE", () => {
  it("contains active states", () => {
    expect(TASK_ACTIVE).toContain("running")
    expect(TASK_ACTIVE).toContain("assigned")
    expect(TASK_ACTIVE).toContain("blocked")
  })
})

describe("createPersistedTaskState", () => {
  it("creates initial task", () => {
    const state = createPersistedTaskState(tid("t_1"), ws("ws_1"), "proj_1", "Do thing", "Description")
    expect(state.id).toBe("t_1")
    expect(state.state).toBe("created")
    expect(state.seq).toBe(1)
    expect(state.priority).toBe("normal")
    expect(state.artifactIds).toEqual([])
  })
})

describe("transitionTaskState", () => {
  it("transitions and bumps seq", () => {
    const initial = createPersistedTaskState(tid("t_1"), ws("ws_1"), "proj_1", "Do thing", "Description")
    const next = transitionTaskState(initial, "validated", "Validate")
    expect(next.state).toBe("validated")
    expect(next.seq).toBe(2)
  })
  it("throws on invalid transition", () => {
    const initial = createPersistedTaskState(tid("t_1"), ws("ws_1"), "proj_1", "Do thing", "Description")
    expect(() => transitionTaskState(initial, "running", "Bad")).toThrow("Invalid task transition")
  })
})

describe("assignTask", () => {
  it("assigns worker and transitions to assigned", () => {
    const initial = createPersistedTaskState(tid("t_1"), ws("ws_1"), "proj_1", "Do thing", "Description")
    const ready = transitionTaskState(initial, "validated", "1")
    const assigned = assignTask(ready, wid("w_1"))
    expect(assigned.state).toBe("assigned")
    expect(assigned.assignedWorkerId).toBe("w_1")
  })
})

describe("updateTaskProgress", () => {
  it("sets progress", () => {
    const state = createPersistedTaskState(tid("t_1"), ws("ws_1"), "proj_1", "Do thing", "Description")
    const updated = updateTaskProgress(state, {
      percentage: 50 as import("@/core/types").Percentage,
      lastUpdatedAt: "2025-01-01T00:00:00.000Z" as import("@/core/types").IsoTimestamp,
    })
    expect(updated.progress?.percentage).toBe(50)
  })
})

describe("blockTask", () => {
  it("blocks with reason", () => {
    const state = createPersistedTaskState(tid("t_1"), ws("ws_1"), "proj_1", "Do thing", "Description")
    const blocked = blockTask(state, "Waiting for dependency")
    expect(blocked.state).toBe("blocked")
    expect(blocked.blockedBy?.reason).toBe("Waiting for dependency")
  })
})

describe("unblockTask", () => {
  it("unblocks to ready", () => {
    const state = createPersistedTaskState(tid("t_1"), ws("ws_1"), "proj_1", "Do thing", "Description")
    const blocked = blockTask(state, "Waiting")
    const unblocked = unblockTask(blocked)
    expect(unblocked.state).toBe("ready")
    expect(unblocked.blockedBy).toBeUndefined()
  })
})

describe("addTaskArtifact", () => {
  it("adds artifact id", () => {
    const state = createPersistedTaskState(tid("t_1"), ws("ws_1"), "proj_1", "Do thing", "Description")
    const updated = addTaskArtifact(state, "art_1")
    expect(updated.artifactIds).toEqual(["art_1"])
  })
})

describe("validateTaskState", () => {
  it("returns no errors for valid state", () => {
    const state = createPersistedTaskState(tid("t_1"), ws("ws_1"), "proj_1", "Do thing", "Description")
    expect(validateTaskState(state)).toEqual([])
  })
  it("catches empty title", () => {
    const state = createPersistedTaskState(tid("t_1"), ws("ws_1"), "proj_1", "", "Description")
    const errors = validateTaskState(state)
    expect(errors).toContain("Title must be set")
  })
})
