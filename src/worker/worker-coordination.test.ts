/**
 * P08-WORKER-COORD — Worker Coordination Tests
 */

import { describe, it, expect } from "vitest"
import type { WorkerId, IsoTimestamp } from "@/core/types"
import { WorkerCoordinationManager } from "./worker-coordination"
import type { NodeResult } from "./worker-types"

function wid(id: string): WorkerId { return id as unknown as WorkerId }

const successResult: NodeResult = {
  outcome: "success",
  summary: "Done",
  artifactIds: ["art_1"],
  producedAt: new Date().toISOString() as IsoTimestamp,
}

describe("WorkerCoordinationManager", () => {
  describe("barriers", () => {
    it("creates and passes a barrier", () => {
      const mgr = new WorkerCoordinationManager()

      const barrier = mgr.createBarrier({
        barrierId: "bar_1",
        label: "Wait for all builders",
        expectedWorkerIds: [wid("w_1"), wid("w_2")],
      })

      expect(barrier.state).toBe("waiting")

      mgr.completeBarrierWorker("bar_1", wid("w_1"))
      expect(mgr.getBarrier("bar_1")!.state).toBe("waiting")

      mgr.completeBarrierWorker("bar_1", wid("w_2"))
      expect(mgr.getBarrier("bar_1")!.state).toBe("passed")
      expect(mgr.getBarrier("bar_1")!.passedAt).toBeTruthy()
    })

    it("fails a barrier", () => {
      const mgr = new WorkerCoordinationManager()
      mgr.createBarrier({ barrierId: "bar_1", label: "Test", expectedWorkerIds: [wid("w_1")] })

      mgr.failBarrier("bar_1")
      expect(mgr.getBarrier("bar_1")!.state).toBe("failed")
    })

    it("cancels a barrier", () => {
      const mgr = new WorkerCoordinationManager()
      mgr.createBarrier({ barrierId: "bar_1", label: "Test", expectedWorkerIds: [wid("w_1")] })

      mgr.cancelBarrier("bar_1")
      expect(mgr.getBarrier("bar_1")!.state).toBe("cancelled")
    })
  })

  describe("work distribution", () => {
    it("creates, assigns, and completes work items", () => {
      const mgr = new WorkerCoordinationManager()

      const item = mgr.createWorkItem({ itemId: "wi_1", objective: "Build feature X" })
      expect(item.state).toBe("pending")

      mgr.assignWorkItem("wi_1", wid("w_1"))
      expect(mgr.getWorkItemsForWorker(wid("w_1")).length).toBe(1)

      mgr.completeWorkItem("wi_1", successResult)
      expect(mgr.getWorkItemsForWorker(wid("w_1"))[0]!.state).toBe("completed")
    })

    it("gets unassigned work items", () => {
      const mgr = new WorkerCoordinationManager()
      mgr.createWorkItem({ itemId: "wi_1", objective: "A" })
      mgr.createWorkItem({ itemId: "wi_2", objective: "B" })
      mgr.assignWorkItem("wi_1", wid("w_1"))

      const unassigned = mgr.getUnassignedWorkItems()
      expect(unassigned.length).toBe(1)
      expect(unassigned[0]!.itemId).toBe("wi_2")
    })
  })

  describe("aggregateResults", () => {
    it("aggregates success results", () => {
      const mgr = new WorkerCoordinationManager()
      const results: NodeResult[] = [
        { outcome: "success", summary: "A", artifactIds: ["art_1"], producedAt: "" as any },
        { outcome: "success", summary: "B", artifactIds: ["art_2"], producedAt: "" as any },
      ]

      const agg = mgr.aggregateResults(results)
      expect(agg.outcome).toBe("success")
      expect(agg.artifactIds).toEqual(["art_1", "art_2"])
    })

    it("aggregates mixed results as partial", () => {
      const mgr = new WorkerCoordinationManager()
      const results: NodeResult[] = [
        { outcome: "success", summary: "A", artifactIds: [], producedAt: "" as any },
        { outcome: "failure", summary: "B", artifactIds: [], producedAt: "" as any },
      ]

      const agg = mgr.aggregateResults(results)
      expect(agg.outcome).toBe("partial")
    })

    it("aggregates all failures", () => {
      const mgr = new WorkerCoordinationManager()
      const results: NodeResult[] = [
        { outcome: "failure", summary: "A", artifactIds: [], producedAt: "" as any },
        { outcome: "failure", summary: "B", artifactIds: [], producedAt: "" as any },
      ]

      const agg = mgr.aggregateResults(results)
      expect(agg.outcome).toBe("failure")
    })
  })
})
