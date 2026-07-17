/* eslint-disable no-non-null-assertion */
/**
 * P04-STATE-RECOVERY — Recovery Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import type { WorkspaceId, RunId, IsoTimestamp } from "@/core/types"
import { InMemoryStateStore, PersistenceService } from "./persistence"
import { InMemorySnapshotStore, SnapshotService } from "./snapshot"
import { RecoveryService } from "./recovery"
import { createPersistedRuntimeState } from "./runtime-state"
import { createPersistedWorkflowRun } from "./workflow-state"
import type { Snapshot } from "./state-types"

function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }
function rid(id: string): RunId { return id as unknown as RunId }
function ts(iso: string): IsoTimestamp { return iso as IsoTimestamp }

describe("RecoveryService", () => {
  let stateStore: InMemoryStateStore
  let snapshotStore: InMemorySnapshotStore
  let persistence: PersistenceService
  let snapshotService: SnapshotService
  let recovery: RecoveryService

  beforeEach(() => {
    stateStore = new InMemoryStateStore()
    snapshotStore = new InMemorySnapshotStore()
    persistence = new PersistenceService(stateStore)
    snapshotService = new SnapshotService(snapshotStore)
    recovery = new RecoveryService(persistence, snapshotService)
  })

  describe("recoverRuntimeState", () => {
    it("recovers saved runtime state", async () => {
      const runtime = createPersistedRuntimeState("rt_1", ws("ws_1"), "1.0.0", ts("2025-01-01T00:00:00.000Z"))
      await stateStore.save(runtime)
      const result = await recovery.recoverRuntimeState("rt_1")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.id).toBe("rt_1")
        expect(result.value.state).toBe("uninitialized")
      }
    })

    it("returns error for missing runtime", async () => {
      const result = await recovery.recoverRuntimeState("nonexistent")
      expect(result.ok).toBe(false)
    })
  })

  describe("recoverWorkflowRun", () => {
    it("recovers a running workflow run", async () => {
      const run = createPersistedWorkflowRun(
        rid("run_1"), "wf_1", 1, ws("ws_1"), "proj_1", "sess_1",
        { kind: "user", actorId: "u_1", reason: "test", at: ts("2025-01-01T00:00:00.000Z") },
        "snap_1", "ctx_1", 5, "1.0.0",
      )
      // Transition to running
      const running = { ...run, state: "running" as const, seq: 3, currentTick: 10 }
      await stateStore.save(running)

      const result = await recovery.recoverWorkflowRun("run_1")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.state).toBe("running")
        expect(result.value.currentTick).toBe(10)
      }
    })

    it("returns error for missing run", async () => {
      const result = await recovery.recoverWorkflowRun("nonexistent")
      expect(result.ok).toBe(false)
    })
  })

  describe("restoreFromSnapshot", () => {
    it("restores from workspace snapshot", async () => {
      const snap: Snapshot = {
        id: "snap_1",
        workspaceId: ws("ws_1"),
        kind: "workspace_snapshot",
        label: "Test",
        payload: { fileChecksums: { "a.ts": "h1", "b.ts": "h2" } },
        metadata: { createdAt: ts("2025-01-01T00:00:00.000Z"), updatedAt: ts("2025-01-01T00:00:00.000Z"), version: 1, checksum: "" },
      }
      await snapshotStore.save(snap)

      const result = await recovery.restoreFromSnapshot("snap_1", ws("ws_1"))
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.status).toBe("completed")
        expect(result.value.restoredEntities).toContain("workspace_state")
      }
    })

    it("rejects cross-workspace restore", async () => {
      const snap: Snapshot = {
        id: "snap_1",
        workspaceId: ws("ws_1"),
        kind: "workspace_snapshot",
        label: "Test",
        payload: {},
        metadata: { createdAt: ts("2025-01-01T00:00:00.000Z"), updatedAt: ts("2025-01-01T00:00:00.000Z"), version: 1, checksum: "" },
      }
      await snapshotStore.save(snap)

      const result = await recovery.restoreFromSnapshot("snap_1", ws("ws_2"))
      expect(result.ok).toBe(false)
    })

    it("returns error for missing snapshot", async () => {
      const result = await recovery.restoreFromSnapshot("nonexistent", ws("ws_1"))
      expect(result.ok).toBe(false)
    })

    it("restores workflow snapshot", async () => {
      const snap: Snapshot = {
        id: "snap_1",
        workspaceId: ws("ws_1"),
        kind: "workflow_snapshot",
        label: "Graph",
        payload: { workflowGraph: { nodes: [], edges: [] } },
        metadata: { createdAt: ts("2025-01-01T00:00:00.000Z"), updatedAt: ts("2025-01-01T00:00:00.000Z"), version: 1, checksum: "" },
      }
      await snapshotStore.save(snap)

      const result = await recovery.restoreFromSnapshot("snap_1", ws("ws_1"))
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.restoredEntities).toContain("workflow_graph")
      }
    })
  })

  describe("buildRecoveryPlan", () => {
    it("builds plan for running run", () => {
      const run = createPersistedWorkflowRun(
        rid("run_1"), "wf_1", 1, ws("ws_1"), "proj_1", "sess_1",
        { kind: "user", actorId: "u_1", reason: "test", at: ts("2025-01-01T00:00:00.000Z") },
        "snap_1", "ctx_1", 5, "1.0.0",
      )
      const running = { ...run, state: "running" as const }
      const plan = recovery.buildRecoveryPlan(running)
      expect(plan.steps).toHaveLength(1)
      expect(plan.steps[0]!.action).toBe("replay_events")
    })

    it("builds plan for failed run", () => {
      const run = createPersistedWorkflowRun(
        rid("run_1"), "wf_1", 1, ws("ws_1"), "proj_1", "sess_1",
        { kind: "user", actorId: "u_1", reason: "test", at: ts("2025-01-01T00:00:00.000Z") },
        "snap_1", "ctx_1", 5, "1.0.0",
      )
      const failed = { ...run, state: "failed" as const }
      const plan = recovery.buildRecoveryPlan(failed)
      expect(plan.steps).toHaveLength(2)
      expect(plan.steps[0]!.action).toBe("verify_integrity")
      expect(plan.steps[1]!.action).toBe("replay_events")
    })
  })

  describe("needsRecovery", () => {
    it("returns true for running runs", () => {
      const run = createPersistedWorkflowRun(
        rid("run_1"), "wf_1", 1, ws("ws_1"), "proj_1", "sess_1",
        { kind: "user", actorId: "u_1", reason: "test", at: ts("2025-01-01T00:00:00.000Z") },
        "snap_1", "ctx_1", 5, "1.0.0",
      )
      const running = { ...run, state: "running" as const }
      expect(recovery.needsRecovery(running)).toBe(true)
    })

    it("returns false for succeeded runs", () => {
      const run = createPersistedWorkflowRun(
        rid("run_1"), "wf_1", 1, ws("ws_1"), "proj_1", "sess_1",
        { kind: "user", actorId: "u_1", reason: "test", at: ts("2025-01-01T00:00:00.000Z") },
        "snap_1", "ctx_1", 5, "1.0.0",
      )
      const succeeded = { ...run, state: "succeeded" as const, endedAt: ts("2025-01-01T01:00:00.000Z") }
      expect(recovery.needsRecovery(succeeded)).toBe(false)
    })
  })
})
