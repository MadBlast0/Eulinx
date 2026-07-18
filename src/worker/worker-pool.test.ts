/**
 * P08-WORKER-POOLS — Worker Pool Tests
 */

import { describe, it, expect } from "vitest"
import type { WorkerId } from "@/core/types"
import { WorkerPoolManager } from "./worker-pool"

function wid(id: string): WorkerId { return id as unknown as WorkerId }

describe("WorkerPoolManager", () => {
  describe("createPool", () => {
    it("creates a pool", () => {
      const mgr = new WorkerPoolManager()
      const pool = mgr.createPool({
        poolId: "pool_1",
        roleId: "builder",
        minSize: 1,
        maxSize: 5,
        scaleUpThreshold: 3,
        scaleDownThreshold: 1,
        cooldownMs: 5000,
      })

      expect(pool.poolId).toBe("pool_1")
      expect(pool.roleId).toBe("builder")
      expect(pool.workerIds).toEqual([])
    })
  })

  describe("addToPool / removeFromPool", () => {
    it("adds and removes workers", () => {
      const mgr = new WorkerPoolManager()
      mgr.createPool({ poolId: "pool_1", roleId: "builder", minSize: 1, maxSize: 5, scaleUpThreshold: 3, scaleDownThreshold: 1, cooldownMs: 5000 })

      mgr.addToPool("pool_1", wid("w_1"))
      mgr.addToPool("pool_1", wid("w_2"))

      expect(mgr.getPool("pool_1")!.workerIds).toEqual(["w_1", "w_2"])

      mgr.removeFromPool("pool_1", wid("w_1"))
      expect(mgr.getPool("pool_1")!.workerIds).toEqual(["w_2"])
    })
  })

  describe("evaluateScale", () => {
    it("scales up when threshold exceeded", () => {
      const mgr = new WorkerPoolManager()
      mgr.createPool({ poolId: "pool_1", roleId: "builder", minSize: 1, maxSize: 5, scaleUpThreshold: 2, scaleDownThreshold: 0, cooldownMs: 0 })

      mgr.addToPool("pool_1", wid("w_1"))
      mgr.addToPool("pool_1", wid("w_2"))

      const decision = mgr.evaluateScale("pool_1", [wid("w_1"), wid("w_2")])
      expect(decision.action).toBe("scale_up")
    })

    it("scales down when below threshold", () => {
      const mgr = new WorkerPoolManager()
      mgr.createPool({ poolId: "pool_1", roleId: "builder", minSize: 1, maxSize: 5, scaleUpThreshold: 3, scaleDownThreshold: 1, cooldownMs: 0 })

      mgr.addToPool("pool_1", wid("w_1"))
      mgr.addToPool("pool_1", wid("w_2"))

      const decision = mgr.evaluateScale("pool_1", [wid("w_1")])
      expect(decision.action).toBe("scale_down")
    })

    it("maintains when within thresholds", () => {
      const mgr = new WorkerPoolManager()
      mgr.createPool({ poolId: "pool_1", roleId: "builder", minSize: 1, maxSize: 5, scaleUpThreshold: 3, scaleDownThreshold: 0, cooldownMs: 0 })

      mgr.addToPool("pool_1", wid("w_1"))

      const decision = mgr.evaluateScale("pool_1", [wid("w_1")])
      expect(decision.action).toBe("maintain")
    })

    it("respects cooldown", () => {
      const mgr = new WorkerPoolManager()
      mgr.createPool({ poolId: "pool_1", roleId: "builder", minSize: 1, maxSize: 5, scaleUpThreshold: 1, scaleDownThreshold: 0, cooldownMs: 60000 })

      mgr.addToPool("pool_1", wid("w_1"))
      mgr.markScaled("pool_1")

      const decision = mgr.evaluateScale("pool_1", [wid("w_1")])
      expect(decision.action).toBe("maintain")
      expect(decision.reason).toContain("Cooldown")
    })
  })

  describe("query", () => {
    it("gets pools by role", () => {
      const mgr = new WorkerPoolManager()
      mgr.createPool({ poolId: "p1", roleId: "builder", minSize: 1, maxSize: 5, scaleUpThreshold: 3, scaleDownThreshold: 1, cooldownMs: 0 })
      mgr.createPool({ poolId: "p2", roleId: "reviewer", minSize: 1, maxSize: 5, scaleUpThreshold: 3, scaleDownThreshold: 1, cooldownMs: 0 })

      expect(mgr.getPoolsByRole("builder").length).toBe(1)
    })
  })
})
