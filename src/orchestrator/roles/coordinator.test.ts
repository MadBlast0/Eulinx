/**
 * P15-ORCH-COORD — Coordinator Orchestrator Tests
 */

import { describe, it, expect } from "vitest"
import { brand } from "@/core/types"
import type { OrchestratorConfig, UserGoal } from "../orchestrator-types"
import { CoordinatorOrchestrator } from "./coordinator"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides?: Partial<OrchestratorConfig>): OrchestratorConfig {
  return {
    id: brand("coord-1"),
    role: "coordinator",
    level: "root",
    displayName: "Test Coordinator",
    workspaceId: brand("ws-1"),
    sessionId: brand("ses-1"),
    projectId: "proj-1",
    refinementMode: "low",
    budgetAllocated: 1_000_000,
    maxWorkers: 10,
    maxDepth: 3,
    allowedRoles: ["coordinator", "planner", "programmer", "reviewer"],
    ...overrides,
  }
}

function makeGoal(overrides?: Partial<UserGoal>): UserGoal {
  return {
    id: "goal-1",
    description: "Build a complete web application with frontend and backend",
    constraints: ["Use React", "Use Node.js"],
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

describe("CoordinatorOrchestrator", () => {
  it("creates plan on start", async () => {
    const coord = new CoordinatorOrchestrator(makeConfig(), makeGoal())
    const result = await coord.start()
    expect(result.ok).toBe(true)
    expect(coord.currentPlan).not.toBeNull()
  })

  it("decomposes goal into phases", async () => {
    const coord = new CoordinatorOrchestrator(makeConfig(), makeGoal())
    await coord.start()
    const plan = coord.currentPlan!
    const phases = Object.values(plan.nodes).filter(n => n.id.startsWith("phase-"))
    expect(phases.length).toBeGreaterThanOrEqual(1)
  })

  it("spawns phase orchestrators", async () => {
    const coord = new CoordinatorOrchestrator(makeConfig(), makeGoal())
    await coord.start()
    const snapshot = coord.getSnapshot()
    expect(snapshot.childOrchestratorIds.length).toBeGreaterThanOrEqual(1)
  })

  it("reports aggregated progress", async () => {
    const coord = new CoordinatorOrchestrator(makeConfig(), makeGoal())
    await coord.start()
    const progress = coord.getAggregatedProgress()
    expect(progress.role).toBe("coordinator")
    expect(progress.childReports.length).toBeGreaterThanOrEqual(1)
  })

  it("completes successfully", async () => {
    const coord = new CoordinatorOrchestrator(makeConfig(), makeGoal())
    await coord.start()
    const result = await coord.complete()
    expect(result.ok).toBe(true)
    expect(coord.state).toBe("completed")
  })

  it("describes its task", () => {
    const coord = new CoordinatorOrchestrator(makeConfig(), makeGoal())
    expect(coord.describe()).toContain("Coordinator")
  })
})
