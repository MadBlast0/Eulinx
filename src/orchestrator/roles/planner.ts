/**
 * P15-ORCH-PLANNER — Planner Orchestrator
 *
 * Decomposes a User Goal into Phases and Tasks with budgets,
 * checklists, dependencies, and ordering constraints.
 * From Planning-Part01 through Part05, AIArchitecture-Part02 §Orchestrator Hierarchy.
 *
 * The Planner is the first AI step after a goal is received.
 * It produces a tree of plan nodes stored for later execution.
 */

import type { Result } from "@/core/result"
import { err, ok } from "@/core/result"
import { CoreError } from "@/core/error"
import type { IsoTimestamp } from "@/core/types"

import { BaseOrchestrator } from "../orchestrator-base"
import type {
  OrchestratorConfig,
  PlanNode,
  Plan,
  UserGoal,
  PlannerConfig,
  ChecklistItem,
} from "../orchestrator-types"

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

export class PlannerOrchestrator extends BaseOrchestrator {
  private readonly plannerConfig: PlannerConfig
  private readonly goal: UserGoal
  private plan: Plan | null = null
  private phaseNodes: PlanNode[] = []

  constructor(
    config: OrchestratorConfig,
    goal: UserGoal,
    plannerConfig?: Partial<PlannerConfig>,
  ) {
    super(config)
    this.goal = goal
    this.plannerConfig = {
      maxDecompositionDepth: 3,
      defaultTaskBudget: 100_000,
      enableReplanning: true,
      criticalPathAnalysis: true,
      ...plannerConfig,
    }
  }

  // -----------------------------------------------------------------------
  // Identity
  // -----------------------------------------------------------------------

  describe(): string {
    return `Planner: decomposing goal "${this.goal.description.slice(0, 50)}..."`
  }

  get currentPlan(): Plan | null {
    return this.plan
  }

  getPhases(): readonly PlanNode[] {
    return [...this.phaseNodes]
  }

  // -----------------------------------------------------------------------
  // Lifecycle hooks
  // -----------------------------------------------------------------------

  protected async onPlan(): Promise<Result<void, CoreError>> {
    this.logger.info(`Planning goal: ${this.goal.description}`)

    // Decompose goal into phases (Planning-Part02 §Decomposition)
    const phases = this.decomposeGoal(this.goal)
    this.phaseNodes = phases

    // Build plan tree
    const nodes: Record<string, PlanNode> = {}
    for (const phase of phases) {
      nodes[phase.id] = phase
      const tasks = this.decomphaseTask(this.goal.id, phases.indexOf(phase), phase.intent)
      for (const task of tasks) {
        nodes[task.id] = task
      }
    }

    this.plan = {
      id: `plan-${this.goal.id}`,
      goal: this.goal.description,
      rootOrchestratorId: this.id,
      nodes,
      totalBudget: this.goal.metadata?.budget as number ?? 1_000_000,
      spentBudget: 0,
      version: 1,
      createdAt: new Date().toISOString() as IsoTimestamp,
      updatedAt: new Date().toISOString() as IsoTimestamp,
    }

    this.logger.info(`Plan created: ${Object.keys(nodes).length} nodes, ${phases.length} phases`)
    return ok(undefined)
  }

  protected async onDelegate(): Promise<Result<void, CoreError>> {
    // Planner delegates by emitting the plan; actual worker spawning is done by the coordinator
    this.logger.info("Plan ready for delegation")
    return ok(undefined)
  }

  protected async onComplete(): Promise<Result<void, CoreError>> {
    this.logger.info("Planning complete")
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Decomposition (Planning-Part02 §Decomposition)
  // -----------------------------------------------------------------------

  private decomposeGoal(goal: UserGoal): PlanNode[] {
    const now = new Date().toISOString() as IsoTimestamp
    const phaseIntents = this.extractPhaseIntents(goal.description)

    return phaseIntents.map((intent, index) => {
      const taskIntents = this.extractTaskIntents(intent)
      const childIds = taskIntents.map((_, ti) => `phase-${goal.id}-${index}-task-${ti}`)

      return {
        id: `phase-${goal.id}-${index}`,
        intent,
        scope: intent,
        ownerOrchestratorId: this.id,
        ownerRole: "coordinator" as const,
        childIds,
        dependencies: index > 0 ? [`phase-${goal.id}-${index - 1}`] : [],
        checklist: [],
        budgetAllocation: Math.floor(this.plannerConfig.defaultTaskBudget * 1.5),
        estimatedSubtasks: taskIntents.length,
        state: "pending" as const,
        orderConstraint: index === 0 ? "parallel" as const : "sequential" as const,
        createdAt: now,
        updatedAt: now,
      }
    })
  }

  private decomphaseTask(goalId: string, phaseIndex: number, intent: string): PlanNode[] {
    const now = new Date().toISOString() as IsoTimestamp
    const taskIntents = this.extractTaskIntents(intent)

    return taskIntents.map((taskIntent, index) => ({
      id: `phase-${goalId}-${phaseIndex}-task-${index}`,
      intent: taskIntent,
      scope: `${intent} > ${taskIntent}`,
      ownerOrchestratorId: this.id,
      ownerRole: "programmer" as const,
      childIds: [],
      dependencies: index > 0 ? [`phase-${goalId}-${phaseIndex}-task-${index - 1}`] : [],
      checklist: this.generateChecklist(taskIntent),
      budgetAllocation: this.plannerConfig.defaultTaskBudget,
      estimatedSubtasks: 1,
      state: "pending" as const,
      orderConstraint: index === 0 ? "parallel" as const : "sequential" as const,
      createdAt: now,
      updatedAt: now,
    }))
  }

  private extractPhaseIntents(goalDescription: string): string[] {
    // Structural decomposition — in production, LLM-driven
    const words = goalDescription.toLowerCase().split(/\s+/)
    if (words.length <= 5) return [goalDescription]

    const mid = Math.ceil(words.length / 2)
    return [
      `Phase 1: ${words.slice(0, mid).join(" ")}`,
      `Phase 2: ${words.slice(mid).join(" ")}`,
    ]
  }

  private extractTaskIntents(phaseIntent: string): string[] {
    return [
      `Research and design: ${phaseIntent}`,
      `Implement: ${phaseIntent}`,
      `Verify: ${phaseIntent}`,
    ]
  }

  private generateChecklist(intent: string): ChecklistItem[] {
    return [
      { id: `cl-${intent.slice(0, 8)}-1`, description: "Design complete", completed: false },
      { id: `cl-${intent.slice(0, 8)}-2`, description: "Implementation complete", completed: false },
      { id: `cl-${intent.slice(0, 8)}-3`, description: "Tests passing", completed: false },
    ].map(item => ({ ...item, id: item.id.replace(/\s/g, "-") }))
  }

  // -----------------------------------------------------------------------
  // Replanning (Planning-Part04 §Replanning)
  // -----------------------------------------------------------------------

  revisePlan(
    phaseId: string,
    newTasks: Array<{ intent: string; dependencies: string[] }>,
  ): Result<void, CoreError> {
    if (!this.plannerConfig.enableReplanning) {
      return err(new CoreError("validation_error", "Replanning is disabled"))
    }

    if (!this.plan) {
      return err(new CoreError("validation_error", "No plan to revise"))
    }

    const phase = this.plan.nodes[phaseId]
    if (!phase) {
      return err(new CoreError("validation_error", `Phase ${phaseId} not found`))
    }

    const now = new Date().toISOString() as IsoTimestamp
    const newNodes: Record<string, PlanNode> = {}

    for (const task of newTasks) {
      const taskId = `${phaseId}-task-revised-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      newNodes[taskId] = {
        id: taskId,
        intent: task.intent,
        scope: `${phase.scope} > ${task.intent}`,
        ownerOrchestratorId: this.id,
        ownerRole: "programmer",
        childIds: [],
        dependencies: task.dependencies,
        checklist: this.generateChecklist(task.intent),
        budgetAllocation: this.plannerConfig.defaultTaskBudget,
        estimatedSubtasks: 1,
        state: "pending",
        orderConstraint: "sequential",
        createdAt: now,
        updatedAt: now,
      }
    }

    // Merge into plan
    const updatedNodes = { ...this.plan.nodes, ...newNodes }
    this.plan = {
      ...this.plan,
      nodes: updatedNodes,
      version: this.plan.version + 1,
      updatedAt: now,
    }

    this.logger.info(`Plan revised: added ${newTasks.length} tasks to ${phaseId}`)
    return ok(undefined)
  }
}
