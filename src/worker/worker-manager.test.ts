/**
 * P08-WORKER-MANAGER — Worker Manager Tests
 */

import { describe, it, expect } from "vitest"
import type { WorkerId, SessionId, IsoTimestamp } from "@/core/types"
import type { WorkerLifecycleRecord } from "@/spawner/worker-lifecycle"
import { WorkerManager } from "./worker-manager"

function wid(id: string): WorkerId { return id as unknown as WorkerId }
function sid(id: string): SessionId { return id as unknown as SessionId }

function mockRecord(overrides?: Partial<WorkerLifecycleRecord>): WorkerLifecycleRecord {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    workerId: "wkr_1",
    workspaceId: "ws_1",
    sessionId: "ses_1",
    state: "idle",
    stateEnteredAt: now,
    transitionSeq: 0,
    missedHeartbeats: 0,
    health: "healthy",
    restartGeneration: 0,
    rootWorkerId: "wkr_1",
    depth: 0,
    lineage: ["wkr_1"],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe("WorkerManager", () => {
  describe("registerWorker", () => {
    it("registers a worker from lifecycle record", () => {
      const mgr = new WorkerManager()
      const worker = mgr.registerWorker(mockRecord())

      expect(worker.workerId).toBe("wkr_1")
      expect(worker.state).toBe("idle")
      expect(worker.health).toBe("healthy")
    })

    it("emits worker.registered event", () => {
      const mgr = new WorkerManager()
      const events: string[] = []
      mgr.onEvent(e => events.push(e.kind))

      mgr.registerWorker(mockRecord())
      expect(events).toContain("worker.registered")
    })

    it("respects maxActiveWorkers limit", () => {
      const mgr = new WorkerManager({ maxActiveWorkers: 2 })
      mgr.registerWorker(mockRecord({ workerId: "wkr_1" }))
      mgr.registerWorker(mockRecord({ workerId: "wkr_2" }))

      expect(() => mgr.registerWorker(mockRecord({ workerId: "wkr_3" }))).toThrow("Max active workers")
    })

    it("rejects duplicate registration", () => {
      const mgr = new WorkerManager()
      mgr.registerWorker(mockRecord())
      expect(() => mgr.registerWorker(mockRecord())).toThrow("already registered")
    })
  })

  describe("deregisterWorker", () => {
    it("deregisters a worker", () => {
      const mgr = new WorkerManager()
      mgr.registerWorker(mockRecord())

      expect(mgr.deregisterWorker(wid("wkr_1"))).toBe(true)
      expect(mgr.getWorker(wid("wkr_1"))).toBeUndefined()
    })

    it("emits worker.deregistered event", () => {
      const mgr = new WorkerManager()
      mgr.registerWorker(mockRecord())
      const events: string[] = []
      mgr.onEvent(e => events.push(e.kind))

      mgr.deregisterWorker(wid("wkr_1"))
      expect(events).toContain("worker.deregistered")
    })
  })

  describe("transitionWorker", () => {
    it("transitions worker state", () => {
      const mgr = new WorkerManager()
      mgr.registerWorker(mockRecord())

      mgr.transitionWorker(wid("wkr_1"), "working")
      expect(mgr.getWorker(wid("wkr_1"))!.state).toBe("working")
    })

    it("emits worker.state_changed event", () => {
      const mgr = new WorkerManager()
      mgr.registerWorker(mockRecord())
      const events: string[] = []
      mgr.onEvent(e => events.push(e.kind))

      mgr.transitionWorker(wid("wkr_1"), "working")
      expect(events).toContain("worker.state_changed")
    })
  })

  describe("updateHealth", () => {
    it("updates worker health", () => {
      const mgr = new WorkerManager()
      mgr.registerWorker(mockRecord())

      mgr.updateHealth(wid("wkr_1"), "degraded")
      expect(mgr.getWorker(wid("wkr_1"))!.health).toBe("degraded")
    })

    it("emits health_changed only on actual change", () => {
      const mgr = new WorkerManager()
      mgr.registerWorker(mockRecord())
      const events: string[] = []
      mgr.onEvent(e => events.push(e.kind))

      mgr.updateHealth(wid("wkr_1"), "healthy") // no change
      expect(events.filter(e => e === "worker.health_changed")).toHaveLength(0)

      mgr.updateHealth(wid("wkr_1"), "degraded")
      expect(events).toContain("worker.health_changed")
    })
  })

  describe("detectStalledWorkers", () => {
    it("detects stalled workers", () => {
      const mgr = new WorkerManager({ stallDetectionMs: -1 })
      mgr.registerWorker(mockRecord({ state: "working" }))

      const stalled = mgr.detectStalledWorkers()
      expect(stalled).toContain("wkr_1")
    })
  })

  describe("metrics", () => {
    it("initializes metrics on registration", () => {
      const mgr = new WorkerManager()
      mgr.registerWorker(mockRecord())

      const metrics = mgr.getMetrics(wid("wkr_1"))
      expect(metrics).toBeDefined()
      expect(metrics!.totalTokensUsed).toBe(0)
    })

    it("updates metrics", () => {
      const mgr = new WorkerManager()
      mgr.registerWorker(mockRecord())

      mgr.updateMetrics(wid("wkr_1"), { totalTokensUsed: 1000 })
      expect(mgr.getMetrics(wid("wkr_1"))!.totalTokensUsed).toBe(1000)
    })
  })

  describe("query API", () => {
    it("filters by state", () => {
      const mgr = new WorkerManager()
      mgr.registerWorker(mockRecord({ workerId: "wkr_1", state: "idle" }))
      mgr.registerWorker(mockRecord({ workerId: "wkr_2", state: "working" }))

      expect(mgr.getWorkersByState("idle").length).toBe(1)
      expect(mgr.getWorkersByState("working").length).toBe(1)
    })

    it("filters by session", () => {
      const mgr = new WorkerManager()
      mgr.registerWorker(mockRecord({ workerId: "wkr_1", sessionId: "ses_1" }))
      mgr.registerWorker(mockRecord({ workerId: "wkr_2", sessionId: "ses_2" }))

      expect(mgr.getWorkersInSession(sid("ses_1")).length).toBe(1)
    })

    it("counts active workers excluding terminated", () => {
      const mgr = new WorkerManager()
      mgr.registerWorker(mockRecord({ workerId: "wkr_1", state: "idle" }))
      mgr.registerWorker(mockRecord({ workerId: "wkr_2", state: "terminated" }))

      expect(mgr.countActiveWorkers()).toBe(1)
    })
  })
})
