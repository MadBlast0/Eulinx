/**
 * P15-ORCH-PLANNER — Planner Orchestrator Tests
 */

import { describe, it, expect } from "vitest"
import { brand } from "@/core/types"
import type { OrchestratorConfig, UserGoal } from "../orchestrator-types"
import { PlannerOrchestrator } from "./planner"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides?: Partial<OrchestratorConfig>): OrchestratorConfig {
  return {
    id: brand("planner-1"),
    role: "planner",
    level: "task",
    displayName: "Test Planner",
    workspaceId: brand("ws-1"),
    sessionId: brand("ses-1"),
    projectId: "proj-1",
    refinementMode: "low",
    budgetAllocated: 500_000,
    maxWorkers: 1,
    maxDepth: 1,
    allowedRoles: ["planner"],
    ...overrides,
  }
}

function makeGoal(overrides?: Partial<UserGoal>): UserGoal {
  return {
    id: "goal-1",
    description: "Build a complete authentication system with JWT",
    constraints: ["Must use bcrypt"],
    priority: "high",
    workspaceId: brand("ws-1"),
    sessionId: brand("ses-1"),
    projectId: "proj-1",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PlannerOrchestrator", () => {
  it("creates a plan on start", async () => {
    const planner = new PlannerOrchestrator(makeConfig(), makeGoal())
    const result = await planner.start()
    expect(result.ok).toBe(true)
    expect(planner.currentPlan).not.toBeNull()
    expect(planner.currentPlan!.goal).toBe("Build a complete authentication system with JWT")
  })

  it("decomposes goal into phases", async () => {
    const planner = new PlannerOrchestrator(makeConfig(), makeGoal())
    await planner.start()
    const phases = planner.getPhases()
    expect(phases.length).toBeGreaterThanOrEqual(1)
    // Each phase should have child tasks
    for (const phase of phases) {
      expect(phase.childIds.length).toBeGreaterThanOrEqual(1)
    }
  })

  it("assigns budgets to phases", async () => {
    const planner = new PlannerOrchestrator(makeConfig(), makeGoal())
    await planner.start()
    const phases = planner.getPhases()
    for (const phase of phases) {
      expect(phase.budgetAllocation).toBeGreaterThan(0)
    }
  })

  it("generates checklists for tasks", async () => {
    const planner = new PlannerOrchestrator(makeConfig(), makeGoal())
    await planner.start()
    const plan = planner.currentPlan!
    const tasks = Object.values(plan.nodes).filter(n => n.id.includes("task"))
    expect(tasks.length).toBeGreaterThan(0)
    for (const task of tasks) {
      expect(task.checklist.length).toBeGreaterThan(0)
    }
  })

  it("sets dependency ordering", async () => {
    const planner = new PlannerOrchestrator(makeConfig(), makeGoal())
    await planner.start()
    const phases = planner.getPhases()
    // First phase has no dependencies, subsequent phases depend on previous
    expect(phases[0].dependencies.length).toBe(0)
    if (phases.length > 1) {
      expect(phases[1].dependencies.length).toBeGreaterThan(0)
    }
  })

  it("revises plan when replanning is enabled", async () => {
    const planner = new PlannerOrchestrator(makeConfig(), makeGoal(), { enableReplanning: true })
    await planner.start()
    const phases = planner.getPhases()
    const result = planner.revisePlan(phases[0].id, [
      { intent: "New task from replanning", dependencies: [] },
    ])
    expect(result.ok).toBe(true)
    const plan = planner.currentPlan!
    expect(plan.version).toBe(2)
  })

  it("rejects revision when replanning is disabled", async () => {
    const planner = new PlannerOrchestrator(makeConfig(), makeGoal(), { enableReplanning: false })
    await planner.start()
    const phases = planner.getPhases()
    const result = planner.revisePlan(phases[0].id, [
      { intent: "Should not work", dependencies: [] },
    ])
    expect(result.ok).toBe(false)
  })

  it("describes its current task", () => {
    const planner = new PlannerOrchestrator(makeConfig(), makeGoal())
    expect(planner.describe()).toContain("Planner")
  })

  it("produces an LLM-driven plan when an executor is supplied", async () => {
    const planner = new PlannerOrchestrator(makeConfig(), makeGoal())
    const llmPlan = JSON.stringify({
      phases: [
        {
          title: "Research auth options",
          tasks: [
            { intent: "Survey JWT libraries", ownerRole: "researcher", budget: 120000 },
            { intent: "Design token schema", ownerRole: "architect", budget: 90000 },
          ],
        },
        {
          title: "Implement login",
          tasks: [{ intent: "Write login handler", ownerRole: "programmer", budget: 150000 }],
        },
      ],
    })
    const executor = async () => ({ ok: true as const, value: llmPlan })
    const result = await planner.planWithLlm(executor)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const phases = Object.values(result.value.nodes).filter((n) => n.ownerRole === "coordinator")
      expect(phases).toHaveLength(2)
      const tasks = Object.values(result.value.nodes).filter((n) => n.id.includes("-task-"))
      expect(tasks).toHaveLength(3)
      // Owner roles come from the LLM, not the structural default.
      expect(tasks.some((t) => t.ownerRole === "researcher")).toBe(true)
      expect(tasks.some((t) => t.ownerRole === "architect")).toBe(true)
      expect(planner.currentPlan).toBe(result.value)
    }
  })

  it("falls back to structural planning when the LLM returns invalid JSON", async () => {
    const planner = new PlannerOrchestrator(makeConfig(), makeGoal())
    const executor = async () => ({ ok: true as const, value: "not json at all" })
    const result = await planner.planWithLlm(executor)
    // Fallback still yields a usable plan.
    expect(result.ok).toBe(true)
    if (result.ok) {
      const phases = Object.values(result.value.nodes).filter((n) => n.id.startsWith("phase-"))
      expect(phases.length).toBeGreaterThanOrEqual(1)
    }
  })

  it("falls back to structural planning when the LLM executor errors", async () => {
    const planner = new PlannerOrchestrator(makeConfig(), makeGoal())
    const executor = async () => ({ ok: false as const, error: new Error("boom") as never })
    const result = await planner.planWithLlm(executor)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const phases = Object.values(result.value.nodes).filter((n) => n.id.startsWith("phase-"))
      expect(phases.length).toBeGreaterThanOrEqual(1)
    }
  })

  it("revises a plan with LLM feedback", async () => {
    const planner = new PlannerOrchestrator(makeConfig(), makeGoal())
    await planner.start()
    const phases = planner.getPhases()
    const revised = JSON.stringify({
      phases: [
        {
          title: phases[0].intent,
          tasks: [{ intent: "Revised task from feedback", ownerRole: "programmer", budget: 100000 }],
        },
      ],
    })
    const executor = async () => ({ ok: true as const, value: revised })
    const result = await planner.revisePlanWithLlm(phases[0].id, "add a setup step", executor)
    expect(result.ok).toBe(true)
  })
})
