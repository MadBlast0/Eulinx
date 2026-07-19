/**
 * P15-ORCH-COORD — Coordinator (Root Orchestrator)
 *
 * Top-level orchestrator that owns the full project plan.
 * Decomposes user goals into phases, spawns phase orchestrators,
 * aggregates progress, and enforces global budget.
 * From AIArchitecture-Part02 §Orchestrator Hierarchy, Planning-Part02.
 */

import type { Result } from "@/core/result"
import { err, ok } from "@/core/result"
import { CoreError } from "@/core/error"
import { brand } from "@/core/types"

import { BaseOrchestrator } from "../orchestrator-base"
import type {
  OrchestratorId,
  OrchestratorConfig,
  OrchestratorRole,
  Plan,
  PlanNode,
  UserGoal,
  ProgressReport,
} from "../orchestrator-types"
import { PlannerOrchestrator, type PlannerGraphNode } from "./planner"

// ---------------------------------------------------------------------------
// Coordinator (Root Orchestrator)
// ---------------------------------------------------------------------------

export class CoordinatorOrchestrator extends BaseOrchestrator {
  private readonly goal: UserGoal
  private readonly graphNodes: readonly PlannerGraphNode[]
  private planner: PlannerOrchestrator | null = null
  private plan: Plan | null = null
  private phaseOrchestrators: Map<OrchestratorId, BaseOrchestrator> = new Map()

  constructor(
    config: OrchestratorConfig,
    goal: UserGoal,
    graphNodes?: readonly PlannerGraphNode[],
  ) {
    super(config)
    this.goal = goal
    this.graphNodes = graphNodes ?? []
  }

  // -----------------------------------------------------------------------
  // Identity
  // -----------------------------------------------------------------------

  describe(): string {
    return `Coordinator: orchestrating goal "${this.goal.description.slice(0, 60)}"`
  }

  get currentPlan(): Plan | null {
    return this.plan
  }

  // -----------------------------------------------------------------------
  // Lifecycle hooks
  // -----------------------------------------------------------------------

  protected async onPlan(): Promise<Result<void, CoreError>> {
    this.logger.info(`Coordinator planning: ${this.goal.description}`)

    // Create planner and decompose the goal (Planning-Part01)
    const plannerConfig: OrchestratorConfig = {
      id: brand(`planner-${this.goal.id}`),
      role: "planner",
      level: "task",
      displayName: "Planner",
      workspaceId: this.config.workspaceId,
      sessionId: this.config.sessionId,
      projectId: this.config.projectId,
      parentOrchestratorId: this.id,
      refinementMode: "low",
      budgetAllocated: Math.floor(this.config.budgetAllocated * 0.1),
      maxWorkers: 1,
      maxDepth: 1,
      allowedRoles: ["planner"],
    }

    this.planner = new PlannerOrchestrator(
      plannerConfig,
      this.goal,
      undefined,
      this.graphNodes,
    )
    const planResult = await this.planner.start()
    if (!planResult.ok) {
      return err(planResult.error)
    }

    this.plan = this.planner.currentPlan
    if (!this.plan) {
      return err(new CoreError("internal_error", "Planner produced no plan"))
    }

    this.logger.info(`Plan created with ${Object.keys(this.plan.nodes).length} nodes`)
    return ok(undefined)
  }

  protected async onDelegate(): Promise<Result<void, CoreError>> {
    if (!this.plan) {
      return err(new CoreError("internal_error", "No plan to delegate"))
    }

    // Spawn phase orchestrators for each top-level phase (AIArchitecture-Part02 §Hierarchy)
    const phases = Object.values(this.plan.nodes).filter(n => n.id.startsWith("phase-"))

    for (const phase of phases) {
      const phaseOrchConfig: OrchestratorConfig = {
        id: brand(`phase-${phase.id}`),
        role: this.mapPhaseToRole(phase.intent),
        level: "phase",
        displayName: phase.intent.slice(0, 50),
        workspaceId: this.config.workspaceId,
        sessionId: this.config.sessionId,
        projectId: this.config.projectId,
        parentOrchestratorId: this.id,
        refinementMode: this.config.refinementMode,
        budgetAllocated: phase.budgetAllocation,
        maxWorkers: 5,
        maxDepth: 2,
        allowedRoles: ["programmer", "reviewer", "researcher", "debugger"],
      }

      // In production, these would be dynamic role-specific orchestrators
      const phaseOrch = new PhaseOrchestratorStub(phaseOrchConfig, phase, this.plan)
      this.phaseOrchestrators.set(phaseOrchConfig.id, phaseOrch)
      this.addChild(phaseOrchConfig.id)
    }

    this.logger.info(`Spawned ${this.phaseOrchestrators.size} phase orchestrators`)
    return ok(undefined)
  }

  protected async onComplete(): Promise<Result<void, CoreError>> {
    this.logger.info("Coordinator: all phases complete")
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Progress aggregation (AIArchitecture-Part02 §Reporting Hierarchy)
  // -----------------------------------------------------------------------

  getAggregatedProgress(): ProgressReport {
    const childReports: ProgressReport[] = []
    for (const orch of this.phaseOrchestrators.values()) {
      childReports.push(orch.getProgress())
    }
    return this.getProgress(childReports)
  }

  // -----------------------------------------------------------------------
  // Role mapping
  // -----------------------------------------------------------------------

  private mapPhaseToRole(phaseIntent: string): OrchestratorRole {
    const lower = phaseIntent.toLowerCase()
    if (lower.includes("research") || lower.includes("investigate")) return "researcher"
    if (lower.includes("design") || lower.includes("architect")) return "architect"
    if (lower.includes("test") || lower.includes("qa")) return "qa"
    if (lower.includes("review") || lower.includes("audit")) return "reviewer"
    if (lower.includes("deploy") || lower.includes("release")) return "release"
    if (lower.includes("document") || lower.includes("docs")) return "documentation"
    if (lower.includes("debug") || lower.includes("fix")) return "debugger"
    return "programmer"
  }
}

// ---------------------------------------------------------------------------
// Phase Orchestrator Stub (simplified for structural completeness)
// ---------------------------------------------------------------------------

class PhaseOrchestratorStub extends BaseOrchestrator {
  private readonly phaseNode: PlanNode
  private readonly plan: Plan

  constructor(
    config: OrchestratorConfig,
    phaseNode: PlanNode,
    plan: Plan,
  ) {
    super(config)
    this.phaseNode = phaseNode
    this.plan = plan
  }

  describe(): string {
    return `Phase: ${this.phaseNode.intent}`
  }

  protected async onPlan(): Promise<Result<void, CoreError>> {
    return ok(undefined)
  }

  protected async onDelegate(): Promise<Result<void, CoreError>> {
    this.logger.info(`Phase "${this.phaseNode.intent}" delegated (${this.getTaskNodes().length} tasks)`)
    return ok(undefined)
  }

  protected async onComplete(): Promise<Result<void, CoreError>> {
    return ok(undefined)
  }

  getPhaseNode(): PlanNode {
    return this.phaseNode
  }

  getTaskNodes(): PlanNode[] {
    return this.phaseNode.childIds
      .map(id => this.plan.nodes[id])
      .filter((n): n is PlanNode => n !== undefined)
  }
}
