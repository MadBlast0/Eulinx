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
import { brand, type TaskId } from "@/core/types"

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
import { ArchitectOrchestrator } from "./architect"
import { ResearcherOrchestrator } from "./researcher"
import { ProgrammerOrchestrator } from "./programmer"
import { ReviewerOrchestrator } from "./reviewer"
import { DebuggerOrchestrator } from "./debugger"
import { DocumentationOrchestrator } from "./documentation"
import { QAOrchestrator } from "./qa"
import { ReleaseOrchestrator } from "./release"
import type { ProviderInvoker } from "@/providers-ai/provider-invoker"

// ---------------------------------------------------------------------------
// Coordinator (Root Orchestrator)
// ---------------------------------------------------------------------------

export class CoordinatorOrchestrator extends BaseOrchestrator {
  private readonly goal: UserGoal
  private readonly graphNodes: readonly PlannerGraphNode[]
  private readonly invoker?: ProviderInvoker
  private planner: PlannerOrchestrator | null = null
  private plan: Plan | null = null
  private phaseOrchestrators: Map<OrchestratorId, BaseOrchestrator> = new Map()

  constructor(
    config: OrchestratorConfig,
    goal: UserGoal,
    graphNodes?: readonly PlannerGraphNode[],
    invoker?: ProviderInvoker,
  ) {
    super(config)
    this.goal = goal
    this.graphNodes = graphNodes ?? []
    this.invoker = invoker
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

    if (this.invoker) {
      const executor = this.invoker.createExecutor({
        providerId: "claude",
        model: this.config.modelProfileId ?? "claude-sonnet-4-20250514",
      })
      const llmResult = await this.planner.planWithLlm(executor)
      if (!llmResult.ok) {
        return err(llmResult.error)
      }
    } else {
      const planResult = await this.planner.start()
      if (!planResult.ok) {
        return err(planResult.error)
      }
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

      const phaseOrch = new PhaseOrchestratorRouter(phaseOrchConfig, phase, this.plan)
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
// Phase Orchestrator Router
// ---------------------------------------------------------------------------

class PhaseOrchestratorRouter extends BaseOrchestrator {
  private readonly phaseNode: PlanNode
  private readonly plan: Plan
  private readonly roleOrchestrators = new Map<OrchestratorRole, BaseOrchestrator>()
  private taskResults: Array<{ taskId: string; status: "success" | "failed"; error?: string }> = []

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
    return `PhaseRouter: orchestrating phase "${this.phaseNode.intent}"`
  }

  protected async onPlan(): Promise<Result<void, CoreError>> {
    this.logger.info(`PhaseRouter planning for phase: ${this.phaseNode.intent}`)
    return ok(undefined)
  }

  protected async onDelegate(): Promise<Result<void, CoreError>> {
    const taskNodes = this.getTaskNodes()
    this.logger.info(`PhaseRouter delegating ${taskNodes.length} tasks for phase "${this.phaseNode.intent}"`)

    for (const task of taskNodes) {
      const roleType = this.detectRoleType(task)
      this.addTask(task.id as TaskId)

      const cost = Math.floor(this.config.budgetAllocated / Math.max(taskNodes.length, 1))
      const budgetResult = this.spendBudget(cost)
      if (!budgetResult.ok) {
        this.logger.warn(`Budget exceeded during phase "${this.phaseNode.intent}" at task "${task.intent}"`)
        this.taskResults.push({ taskId: task.id, status: "failed", error: budgetResult.error.message })
        break
      }

      try {
        const result = await this.dispatchTask(roleType, task)
        if (result.ok) {
          this.taskResults.push({ taskId: task.id, status: "success" })
        } else {
          this.taskResults.push({ taskId: task.id, status: "failed", error: result.error.message })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.error(`Task "${task.intent}" failed: ${message}`)
        this.taskResults.push({ taskId: task.id, status: "failed", error: message })
      }
    }

    this.emit("orchestrator.state_changed", {
      phase: this.phaseNode.intent,
      tasksDelegated: taskNodes.length,
      tasksSucceeded: this.taskResults.filter(r => r.status === "success").length,
      tasksFailed: this.taskResults.filter(r => r.status === "failed").length,
    })

    return ok(undefined)
  }

  protected async onComplete(): Promise<Result<void, CoreError>> {
    const succeeded = this.taskResults.filter(r => r.status === "success").length
    const total = this.taskResults.length
    this.logger.info(`PhaseRouter phase "${this.phaseNode.intent}" completed: ${succeeded}/${total} tasks succeeded`)
    const report = this.getProgress()
    this.logger.info(`Progress: ${report.percentComplete}% complete, $${(report.budgetSpent / 100).toFixed(2)} spent`)
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

  private detectRoleType(task: PlanNode): OrchestratorRole {
    return task.ownerRole
  }

  private async dispatchTask(roleType: OrchestratorRole, task: PlanNode): Promise<Result<void, CoreError>> {
    const orchestrator = this.createRoleOrchestrator(roleType, task)
    if (!orchestrator) {
      return err(new CoreError("internal_error", `No orchestrator for role: ${roleType} on task "${task.intent}"`))
    }

    this.roleOrchestrators.set(roleType, orchestrator)
    this.addChild(orchestrator.id)

    const startResult = await orchestrator.start()
    if (!startResult.ok) {
      this.failChild(orchestrator.id, startResult.error.message)
      return startResult
    }

    const completeResult = await orchestrator.complete()
    if (!completeResult.ok) {
      this.failChild(orchestrator.id, completeResult.error.message)
      return completeResult
    }

    this.completeChild(orchestrator.id)
    return ok(undefined)
  }

  private createRoleOrchestrator(roleType: OrchestratorRole, task: PlanNode): BaseOrchestrator | null {
    const childConfig: OrchestratorConfig = {
      id: brand(`task-${this.id}-${task.id}`),
      role: roleType,
      level: "task",
      displayName: task.intent.slice(0, 50),
      workspaceId: this.config.workspaceId,
      sessionId: this.config.sessionId,
      projectId: this.config.projectId,
      parentOrchestratorId: this.id,
      refinementMode: this.config.refinementMode,
      budgetAllocated: task.budgetAllocation,
      maxWorkers: 1,
      maxDepth: 1,
      allowedRoles: [roleType],
    }

    switch (roleType) {
      case "planner":
        return null
      case "architect":
        return new ArchitectOrchestrator(childConfig, task, this.plan)
      case "researcher":
        return new ResearcherOrchestrator(childConfig, task, this.plan)
      case "programmer":
        return new ProgrammerOrchestrator(childConfig, task, this.plan)
      case "reviewer":
        return new ReviewerOrchestrator(childConfig)
      case "debugger":
        return new DebuggerOrchestrator(childConfig, task, this.plan)
      case "documentation":
        return new DocumentationOrchestrator(childConfig, task, this.plan)
      case "qa":
        return new QAOrchestrator(childConfig, task, this.plan)
      case "release":
        return new ReleaseOrchestrator(childConfig, task, this.plan)
      default:
        return null
    }
  }
}
