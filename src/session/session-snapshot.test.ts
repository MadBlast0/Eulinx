/**
 * P07-SESSION-SNAP — Session Snapshot Tests
 */

import { describe, it, expect } from "vitest"
import type { SessionId, WorkerId } from "@/core/types"
import type { PersistedSessionState } from "@/state/session-state"
import { SessionSnapshotManager, validateSnapshotRestore } from "./session-snapshot"
import type { SessionSnapshot } from "./session-types"

function sid(id: string): SessionId { return id as unknown as SessionId }
function wid(id: string): WorkerId { return id as unknown as WorkerId }

function mockSessionState(overrides?: Partial<PersistedSessionState>): PersistedSessionState {
  const now = new Date().toISOString()
  return {
    id: sid("ses_1"),
    workspaceId: "ws_1" as any,
    runtimeId: "rt_1",
    kind: "chat",
    state: "running",
    seq: 5,
    activeWorkerIds: [wid("w_1"), wid("w_2")],
    activeTaskIds: ["t_1"],
    artifactIds: ["art_1"],
    metrics: {
      totalWorkersSpawned: 2,
      totalTasksExecuted: 1,
      totalArtifactsCreated: 1,
      totalTokensUsed: 1000,
      totalCostMicroUsd: 500,
      totalDurationMs: 30000,
      errorCount: 0,
    },
    startedAt: now as any,
    lastPersistedAt: now as any,
    metadata: {
      createdAt: now as any,
      updatedAt: now as any,
      version: 5,
      checksum: "",
    },
    ...overrides,
  }
}

describe("SessionSnapshotManager", () => {
  describe("createSnapshot", () => {
    it("creates a snapshot from session state", () => {
      const mgr = new SessionSnapshotManager()
      const state = mockSessionState()

      const snap = mgr.createSnapshot(
        { sessionId: sid("ses_1"), label: "Test snapshot" },
        state,
      )

      expect(snap.snapshotId).toBeTruthy()
      expect(snap.sessionId).toBe("ses_1")
      expect(snap.eventSeq).toBe(5)
      expect(snap.label).toBe("Test snapshot")
      expect(snap.activeWorkerIds).toEqual(["w_1", "w_2"])
      expect(snap.activeTaskIds).toEqual(["t_1"])
      expect(snap.artifactIds).toEqual(["art_1"])
    })

    it("captures worker states", () => {
      const mgr = new SessionSnapshotManager()
      const state = mockSessionState()
      const workerStates = { w_1: { state: "working" }, w_2: { state: "idle" } }

      const snap = mgr.createSnapshot(
        { sessionId: sid("ses_1"), label: "With workers" },
        state,
        workerStates,
      )

      expect(snap.workerStates).toEqual(workerStates)
    })
  })

  describe("getSnapshot / getSessionSnapshots", () => {
    it("retrieves snapshots", () => {
      const mgr = new SessionSnapshotManager()
      const state = mockSessionState()

      mgr.createSnapshot({ sessionId: sid("ses_1"), label: "Snap 1" }, state)
      mgr.createSnapshot({ sessionId: sid("ses_1"), label: "Snap 2" }, state)

      const all = mgr.getSessionSnapshots(sid("ses_1"))
      expect(all.length).toBe(2)
      expect(all[0]!.label).toBe("Snap 1")
      expect(all[1]!.label).toBe("Snap 2")
    })

    it("getLatestSnapshot returns last snapshot", () => {
      const mgr = new SessionSnapshotManager()
      const state = mockSessionState()

      mgr.createSnapshot({ sessionId: sid("ses_1"), label: "First" }, state)
      const second = mgr.createSnapshot({ sessionId: sid("ses_1"), label: "Second" }, state)

      const latest = mgr.getLatestSnapshot(sid("ses_1"))
      expect(latest!.snapshotId).toBe(second.snapshotId)
    })

    it("getSnapshotsBefore filters by event seq", () => {
      const mgr = new SessionSnapshotManager()

      mgr.createSnapshot({ sessionId: sid("ses_1"), label: "At 3" }, mockSessionState({ seq: 3 } as any))
      mgr.createSnapshot({ sessionId: sid("ses_1"), label: "At 5" }, mockSessionState({ seq: 5 } as any))
      mgr.createSnapshot({ sessionId: sid("ses_1"), label: "At 8" }, mockSessionState({ seq: 8 } as any))

      const before = mgr.getSnapshotsBefore(sid("ses_1"), 5)
      expect(before.length).toBe(2)
    })
  })

  describe("deleteSnapshot", () => {
    it("deletes a snapshot", () => {
      const mgr = new SessionSnapshotManager()
      const state = mockSessionState()

      const snap = mgr.createSnapshot({ sessionId: sid("ses_1"), label: "Delete me" }, state)
      expect(mgr.getSnapshotCount(sid("ses_1"))).toBe(1)

      mgr.deleteSnapshot(snap.snapshotId)
      expect(mgr.getSnapshotCount(sid("ses_1"))).toBe(0)
    })

    it("deleteSessionSnapshots removes all for session", () => {
      const mgr = new SessionSnapshotManager()
      const state = mockSessionState()

      mgr.createSnapshot({ sessionId: sid("ses_1"), label: "A" }, state)
      mgr.createSnapshot({ sessionId: sid("ses_1"), label: "B" }, state)

      const deleted = mgr.deleteSessionSnapshots(sid("ses_1"))
      expect(deleted).toBe(2)
      expect(mgr.getSnapshotCount(sid("ses_1"))).toBe(0)
    })
  })
})

describe("validateSnapshotRestore", () => {
  it("returns no errors for valid restore", () => {
    const snap: SessionSnapshot = {
      snapshotId: "snap_1",
      sessionId: sid("ses_1"),
      eventSeq: 5,
      label: "Test",
      workerStates: {},
      activeWorkerIds: [],
      activeTaskIds: [],
      artifactIds: [],
      metrics: {},
      createdAt: new Date().toISOString() as any,
    }

    expect(validateSnapshotRestore(snap, sid("ses_1"))).toEqual([])
  })

  it("rejects mismatched session", () => {
    const snap: SessionSnapshot = {
      snapshotId: "snap_1",
      sessionId: sid("ses_1"),
      eventSeq: 5,
      label: "Test",
      workerStates: {},
      activeWorkerIds: [],
      activeTaskIds: [],
      artifactIds: [],
      metrics: {},
      createdAt: new Date().toISOString() as any,
    }

    const errors = validateSnapshotRestore(snap, sid("ses_2"))
    expect(errors).toContain("Snapshot belongs to a different session")
  })
})
