/**
 * P15-ORCH — Base Orchestrator Tests
 */

import { describe, it, expect } from "vitest"
import { brand } from "@/core/types"
import { CoreError } from "@/core/error"
import type { OrchestratorId, OrchestratorConfig, PlanNode } from "./orchestrator-types"
import { BaseOrchestrator } from "./orchestrator-base"

// ---------------------------------------------------------------------------
// Test Orchestrator
// ---------------------------------------------------------------------------

class TestOrchestrator extends BaseOrchestrator {
  private planCalled = false
  private delegateCalled = false
  private completeCalled = false

  protected async onPlan() {
    this.planCalled = true
    return { ok: true as const, value: undefined }
  }

  protected async onDelegate() {
    this.delegateCalled = true
    return { ok: true as const, value: undefined }
  }

  protected async onComplete() {
    this.completeCalled = true
    return { ok: true as const, value: undefined }
  }

  describe(): string {
    return "Test orchestrator"
  }

  getPlanCalled() { return this.planCalled }
  getDelegateCalled() { return this.delegateCalled }
  getCompleteCalled() { return this.completeCalled }
}

class FailingPlanOrchestrator extends BaseOrchestrator {
  protected async onPlan() {
    return { ok: false as const, error: new CoreError("internal_error", "Plan failed") }
  }
  protected async onDelegate() { return { ok: true as const, value: undefined } }
  protected async onComplete() { return { ok: true as const, value: undefined } }
  describe(): string { return "Failing plan" }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides?: Partial<OrchestratorConfig>): OrchestratorConfig {
  return {
    id: brand("orch-1"),
    role: "coordinator",
    level: "root",
    displayName: "Test Orchestrator",
    workspaceId: brand("ws-1"),
    sessionId: brand("ses-1"),
    projectId: "proj-1",
    refinementMode: "low",
    budgetAllocated: 1_000_000,
    maxWorkers: 5,
    maxDepth: 3,
    allowedRoles: ["coordinator", "planner", "programmer"],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BaseOrchestrator", () => {
  it("starts in pending state", () => {
    const orch = new TestOrchestrator(makeConfig())
    expect(orch.state).toBe("pending")
  })

  it("transitions through planning → delegating → running on start", async () => {
    const orch = new TestOrchestrator(makeConfig())
    const result = await orch.start()
    expect(result.ok).toBe(true)
    expect(orch.state).toBe("running")
    expect(orch.getPlanCalled()).toBe(true)
    expect(orch.getDelegateCalled()).toBe(true)
  })

  it("fails to start if not pending", async () => {
    const orch = new TestOrchestrator(makeConfig())
    await orch.start()
    const result = await orch.start()
    expect(result.ok).toBe(false)
  })

  it("transitions to failed if onPlan fails", async () => {
    const orch = new FailingPlanOrchestrator(makeConfig())
    const result = await orch.start()
    expect(result.ok).toBe(false)
    expect(orch.state).toBe("failed")
  })

  it("completes successfully", async () => {
    const orch = new TestOrchestrator(makeConfig())
    await orch.start()
    const result = await orch.complete()
    expect(result.ok).toBe(true)
    expect(orch.state).toBe("completed")
  })

  it("cancels with reason", async () => {
    const orch = new TestOrchestrator(makeConfig())
    await orch.start()
    const result = await orch.cancel("user cancelled")
    expect(result.ok).toBe(true)
    expect(orch.state).toBe("cancelled")
  })

  it("pauses and resumes", async () => {
    const orch = new TestOrchestrator(makeConfig())
    await orch.start()
    const pauseResult = await orch.pause("test pause")
    expect(pauseResult.ok).toBe(true)
    expect(orch.state).toBe("paused")
    const resumeResult = await orch.resume()
    expect(resumeResult.ok).toBe(true)
    expect(orch.state).toBe("running")
  })

  it("tracks budget spending", () => {
    const orch = new TestOrchestrator(makeConfig({ budgetAllocated: 1000 }))
    expect(orch.budgetRemaining).toBe(1000)
    const spendResult = orch.spendBudget(300)
    expect(spendResult.ok).toBe(true)
    expect(orch.budgetRemaining).toBe(700)
  })

  it("rejects budget spend that exceeds allocation", () => {
    const orch = new TestOrchestrator(makeConfig({ budgetAllocated: 100 }))
    const result = orch.spendBudget(200)
    expect(result.ok).toBe(false)
  })

  it("tracks pass count", () => {
    const orch = new TestOrchestrator(makeConfig())
    expect(orch.incrementPass()).toBe(1)
    expect(orch.incrementPass()).toBe(2)
  })

  it("emits events", async () => {
    const orch = new TestOrchestrator(makeConfig())
    await orch.start()
    const events = orch.getEvents()
    expect(events.length).toBeGreaterThan(0)
    expect(events[0].type).toBe("orchestrator.started")
  })

  it("returns correct snapshot", async () => {
    const orch = new TestOrchestrator(makeConfig())
    await orch.start()
    const snapshot = orch.getSnapshot()
    expect(snapshot.state).toBe("running")
    expect(snapshot.config.role).toBe("coordinator")
    expect(snapshot.budgetSpent).toBe(0)
  })

  it("reports progress", async () => {
    const orch = new TestOrchestrator(makeConfig())
    await orch.start()
    const progress = orch.getProgress()
    expect(progress.role).toBe("coordinator")
    expect(progress.level).toBe("root")
  })
})
