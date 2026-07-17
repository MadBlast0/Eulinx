/**
 * P06-SPAWN-MANAGER — Spawn Manager Integration Tests
 */

import { describe, it, expect } from "vitest"
import { SpawnManager } from "./spawn-manager"
import type { SpawnManagerEvent } from "./spawn-manager"
import { STANDARD_ROLES } from "./spawner-types"
import type { WorkerRole, WorkerSpawnRequest } from "./spawner-types"
import type { IsoTimestamp } from "@/core/types"
import type { ValidationContext } from "./spawner-validation"
import type { AdmissionState } from "./spawner-admission"

function createRoleRegistry(): Map<string, WorkerRole> {
  const registry = new Map<string, WorkerRole>()
  for (const role of STANDARD_ROLES) {
    registry.set(role.roleId, role as WorkerRole)
  }
  return registry
}

function makeSpawnRequest(overrides: Partial<WorkerSpawnRequest> = {}): WorkerSpawnRequest {
  return {
    id: `req_${Date.now()}`,
    workspaceId: "ws_001",
    projectId: "proj_001",
    sessionId: "ses_001",
    requestedBy: { kind: "user", id: "user_001" },
    workerKind: "claude_code",
    cliProfileId: "claude-code",
    promptPackageId: "pp_001",
    contextPackageId: "cp_001",
    permissionProfileId: "perm_001",
    sandboxProfileId: "sbx_001",
    spawnMode: "normal",
    priority: "normal",
    reason: "Test spawn",
    createdAt: new Date().toISOString() as IsoTimestamp,
    ...overrides,
  }
}

const VALID_CONTEXT: ValidationContext = {
  workspaceLoaded: true,
  workspaceArchived: false,
  sessionActive: true,
  parentExists: true,
  parentInSameWorkspace: true,
  parentCanSpawn: true,
  cliProfileExists: true,
  cliExecutableAvailable: true,
  runtimeReady: true,
  budgetAvailable: true,
}

const FULL_ADMISSION: AdmissionState = {
  liveWorkersInWorkspace: 0,
  liveWorkersInSession: 0,
  liveWorkersGlobal: 0,
  freeTerminalSlots: 4,
  providerRateLimited: false,
  workspaceBudgetRemaining: 100,
  sessionBudgetRemaining: 100,
  parentBudgetRemaining: 100,
  freeDiskBytes: 10_000_000_000,
  minimumDiskBytes: 100_000_000,
  runtimeHealth: "healthy",
  schedulerQueueDepth: 0,
  maxSchedulerQueueDepth: 100,
  maxLiveWorkersPerWorkspace: 32,
  maxLiveWorkersPerSession: 16,
  maxLiveWorkersGlobal: 64,
}

describe("SpawnManager", () => {
  describe("submitSpawnRequest", () => {
    it("enqueues a valid request", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const request = makeSpawnRequest()
      const readiness = await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      expect(readiness.ready).toBe(true)
      expect(readiness.blockedBy).toHaveLength(0)
    })

    it("emits spawn_requested event", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const events: SpawnManagerEvent[] = []
      manager.onEvent(e => events.push(e))

      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      expect(events.some(e => e.kind === "worker.spawn_requested")).toBe(true)
    })

    it("emits spawn_validating event", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const events: SpawnManagerEvent[] = []
      manager.onEvent(e => events.push(e))

      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      expect(events.some(e => e.kind === "worker.spawn_validating")).toBe(true)
    })

    it("rejects when validation fails", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const request = makeSpawnRequest()
      const badContext = { ...VALID_CONTEXT, workspaceLoaded: false }
      const readiness = await manager.submitSpawnRequest(request, badContext, FULL_ADMISSION)
      expect(readiness.ready).toBe(false)
      expect(readiness.blockedBy.length).toBeGreaterThan(0)
    })

    it("emits spawn_rejected on validation failure", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const events: SpawnManagerEvent[] = []
      manager.onEvent(e => events.push(e))

      const request = makeSpawnRequest()
      const badContext = { ...VALID_CONTEXT, workspaceLoaded: false }
      await manager.submitSpawnRequest(request, badContext, FULL_ADMISSION)
      expect(events.some(e => e.kind === "worker.spawn_rejected")).toBe(true)
    })

    it("rejects when admission rejects (budget exhausted)", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const request = makeSpawnRequest()
      const noBudget = { ...FULL_ADMISSION, workspaceBudgetRemaining: 0 }
      const readiness = await manager.submitSpawnRequest(request, VALID_CONTEXT, noBudget)
      expect(readiness.ready).toBe(false)
    })

    it("defers when admission defers (worker limit)", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const request = makeSpawnRequest()
      const fullWorkspace = { ...FULL_ADMISSION, liveWorkersInWorkspace: 32 }
      const readiness = await manager.submitSpawnRequest(request, VALID_CONTEXT, fullWorkspace)
      expect(readiness.ready).toBe(false)
      expect(readiness.blockedBy.some(b => b.recoverable)).toBe(true)
    })

    it("handles idempotent requests after processing", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      await manager.processNext(request, "builder", "test")
      // Second submit with same ID should be detected as idempotent
      const second = await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      expect(second.warnings.some(w => w.kind === "idempotent")).toBe(true)
    })

    it("rejects when queue is full", async () => {
      const manager = new SpawnManager({ maxSpawnQueue: 2 }, createRoleRegistry())
      await manager.submitSpawnRequest(makeSpawnRequest(), VALID_CONTEXT, FULL_ADMISSION)
      await manager.submitSpawnRequest(makeSpawnRequest(), VALID_CONTEXT, FULL_ADMISSION)
      const third = await manager.submitSpawnRequest(makeSpawnRequest(), VALID_CONTEXT, FULL_ADMISSION)
      expect(third.ready).toBe(false)
      expect(third.blockedBy.some(b => b.message.includes("full"))).toBe(true)
    })
  })

  describe("processNext", () => {
    it("creates a worker with valid role", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)

      const result = await manager.processNext(request, "builder", "Implement feature X")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.worker.workerId).toMatch(/^wkr_/)
        expect(result.worker.depth).toBe(0)
      }
    })

    it("emits record_created event", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const events: SpawnManagerEvent[] = []
      manager.onEvent(e => events.push(e))

      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      await manager.processNext(request, "builder", "test")

      expect(events.some(e => e.kind === "worker.record_created")).toBe(true)
    })

    it("emits context_prepared event", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const events: SpawnManagerEvent[] = []
      manager.onEvent(e => events.push(e))

      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      await manager.processNext(request, "builder", "test")

      expect(events.some(e => e.kind === "worker.context_prepared")).toBe(true)
    })

    it("emits process_starting event", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const events: SpawnManagerEvent[] = []
      manager.onEvent(e => events.push(e))

      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      await manager.processNext(request, "builder", "test")

      expect(events.some(e => e.kind === "worker.process_starting")).toBe(true)
    })

    it("emits started event", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const events: SpawnManagerEvent[] = []
      manager.onEvent(e => events.push(e))

      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      await manager.processNext(request, "builder", "test")

      expect(events.some(e => e.kind === "worker.started")).toBe(true)
    })

    it("rejects unknown role", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)

      const result = await manager.processNext(request, "nonexistent_role", "test")
      expect(result.ok).toBe(false)
    })

    it("rejects child role not allowed by parent", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      // First create a reviewer parent worker
      const parentRequest = makeSpawnRequest()
      await manager.submitSpawnRequest(parentRequest, VALID_CONTEXT, FULL_ADMISSION)
      const parentResult = await manager.processNext(parentRequest, "reviewer", "review code")
      expect(parentResult.ok).toBe(true)

      if (parentResult.ok) {
        // Now try to spawn a builder child from the reviewer parent
        // reviewer has allowedChildRoleIds: [] so builder is not allowed
        const childRequest = makeSpawnRequest({ parentWorkerId: parentResult.worker.workerId })
        await manager.submitSpawnRequest(childRequest, VALID_CONTEXT, FULL_ADMISSION)
        const result = await manager.processNext(childRequest, "builder", "test")
        expect(result.ok).toBe(false)
      }
    })

    it("resolved profile uses role defaults", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)

      const result = await manager.processNext(request, "reviewer", "Review code")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.resolved.roleId).toBe("reviewer")
        expect(result.resolved.resolvedSandbox.strategy).toBe("project_readonly")
        expect(result.resolved.resolvedModel.modelId).toBe("claude-sonnet-4-8")
      }
    })
  })

  describe("cancelSpawnRequest", () => {
    it("cancels a queued request", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)

      const cancelled = manager.cancelSpawnRequest(request.id, { kind: "user", id: "user_001" })
      expect(cancelled).toBe(true)
    })

    it("emits cancel_requested event", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const events: SpawnManagerEvent[] = []
      manager.onEvent(e => events.push(e))

      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      manager.cancelSpawnRequest(request.id, { kind: "user", id: "user_001" })

      expect(events.some(e => e.kind === "worker.cancel_requested")).toBe(true)
    })

    it("returns false for unknown request", () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const result = manager.cancelSpawnRequest("nonexistent", { kind: "user", id: "user_001" })
      expect(result).toBe(false)
    })
  })

  describe("terminateWorker", () => {
    it("cancels a requested worker", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      const result = await manager.processNext(request, "builder", "test")
      expect(result.ok).toBe(true)

      if (result.ok) {
        // Worker is in "requested" state; "cancel" is the valid trigger
        const cancelled = manager.terminateWorker(
          result.worker.workerId,
          { kind: "user", id: "user_001" },
          "User cancelled",
        )
        expect(cancelled).toBe(true)
      }
    })

    it("returns false for unknown worker", () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const result = manager.terminateWorker("wkr_nonexistent", { kind: "user", id: "user_001" }, "test")
      expect(result).toBe(false)
    })
  })

  describe("getWorker", () => {
    it("returns worker record after creation", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      const result = await manager.processNext(request, "builder", "test")

      if (result.ok) {
        const record = manager.getWorker(result.worker.workerId)
        expect(record).toBeDefined()
        expect(record?.workerId).toBe(result.worker.workerId)
      }
    })

    it("returns undefined for unknown worker", () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      expect(manager.getWorker("wkr_nonexistent")).toBeUndefined()
    })
  })

  describe("getActiveWorkerCount", () => {
    it("counts active workers", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      expect(manager.getActiveWorkerCount()).toBe(0)

      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      await manager.processNext(request, "builder", "test")
      expect(manager.getActiveWorkerCount()).toBe(1)
    })
  })

  describe("getEvents", () => {
    it("records all emitted events", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      await manager.processNext(request, "builder", "test")

      const events = manager.getEvents()
      expect(events.length).toBeGreaterThan(0)
      expect(events[0]?.kind).toBe("worker.spawn_requested")
    })
  })

  describe("onEvent", () => {
    it("subscribes to events", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const received: SpawnManagerEvent[] = []
      const unsub = manager.onEvent(e => received.push(e))

      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      expect(received.length).toBeGreaterThan(0)

      unsub()
      const request2 = makeSpawnRequest()
      await manager.submitSpawnRequest(request2, VALID_CONTEXT, FULL_ADMISSION)
      // Should not receive new events after unsubscribe
      expect(received.length).toBeLessThanOrEqual(3) // spawn_requested + spawn_validating from first
    })
  })

  describe("recoverWorkers", () => {
    it("recovers workers from persisted state", () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const result = manager.recoverWorkers([
        { workerId: "wkr_001", state: "working", restartGeneration: 0 },
        { workerId: "wkr_002", state: "terminated", restartGeneration: 0 },
      ])
      expect(result.recoveredCount).toBe(1)
    })
  })

  describe("cleanupWorker", () => {
    it("returns empty plan for requested worker (no resources to clean)", async () => {
      const manager = new SpawnManager({}, createRoleRegistry())
      const request = makeSpawnRequest()
      await manager.submitSpawnRequest(request, VALID_CONTEXT, FULL_ADMISSION)
      const result = await manager.processNext(request, "builder", "test")

      if (result.ok) {
        const summary = await manager.cleanupWorker(result.worker.workerId)
        expect(summary.success).toBe(true)
        // Requested workers have no allocated resources, so no cleanup actions
        expect(summary.actionsExecuted).toHaveLength(0)
      }
    })
  })
})
