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

/** Minimal graph-node shape the planner uses when decomposing a node graph
 *  into phases/tasks. Kept structural — no LLM required. */
export interface PlannerGraphNode {
  readonly id: string
  readonly label: string
  readonly kind: string
}

const PHASE_BATCH_SIZE = 4

export class PlannerOrchestrator extends BaseOrchestrator {
  private readonly plannerConfig: PlannerConfig
  private readonly goal: UserGoal
  private readonly graphNodes: readonly PlannerGraphNode[]
  private plan: Plan | null = null
  private phaseNodes: PlanNode[] = []

  constructor(
    config: OrchestratorConfig,
    goal: UserGoal,
    plannerConfig?: Partial<PlannerConfig>,
    graphNodes?: readonly PlannerGraphNode[],
  ) {
    super(config)
    this.goal = goal
    this.graphNodes = graphNodes ?? []
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
    const phaseSpecs = this.extractPhaseIntents(this.goal.description)
    const phases = this.decomposeGoal(this.goal, phaseSpecs)
    this.phaseNodes = phases

    // Build plan tree
    const nodes: Record<string, PlanNode> = {}
    phases.forEach((phase, index) => {
      nodes[phase.id] = phase
      const phaseNodesForTasks = phaseSpecs[index]?.nodes ?? []
      const tasks = this.decomphaseTask(this.goal.id, index, phase.intent, phaseNodesForTasks)
      for (const task of tasks) {
        nodes[task.id] = task
      }
    })

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

  private decomposeGoal(
    goal: UserGoal,
    phaseSpecs: readonly { title: string; nodes: readonly PlannerGraphNode[] }[],
  ): PlanNode[] {
    const now = new Date().toISOString() as IsoTimestamp

    return phaseSpecs.map((phase, index) => {
      const phaseId = `phase-${goal.id}-${index}`
      const taskNodes = phase.nodes
      const childIds = taskNodes.map((_, ti) => `${phaseId}-task-${ti}`)

      return {
        id: phaseId,
        intent: phase.title,
        scope: phase.title,
        ownerOrchestratorId: this.id,
        ownerRole: "coordinator" as const,
        childIds,
        dependencies: index > 0 ? [`phase-${goal.id}-${index - 1}`] : [],
        checklist: [],
        budgetAllocation: Math.floor(this.plannerConfig.defaultTaskBudget * 1.5),
        estimatedSubtasks: taskNodes.length,
        state: "pending" as const,
        orderConstraint: index === 0 ? "parallel" as const : "sequential" as const,
        createdAt: now,
        updatedAt: now,
      }
    })
  }

  private decomphaseTask(goalId: string, phaseIndex: number, phaseTitle: string, nodes: readonly PlannerGraphNode[]): PlanNode[] {
    const now = new Date().toISOString() as IsoTimestamp

    return nodes.map((node, index) => ({
      id: `phase-${goalId}-${phaseIndex}-task-${index}`,
      intent: `Execute node "${node.label}" (${node.kind})`,
      scope: `${phaseTitle} > ${node.label}`,
      ownerOrchestratorId: this.id,
      ownerRole: this.mapNodeKindToRole(node.kind),
      childIds: [],
      dependencies: index > 0 ? [`phase-${goalId}-${phaseIndex}-task-${index - 1}`] : [],
      checklist: this.generateChecklist(node.label),
      budgetAllocation: this.plannerConfig.defaultTaskBudget,
      estimatedSubtasks: 1,
      state: "pending" as const,
      orderConstraint: "sequential" as const,
      createdAt: now,
      updatedAt: now,
    }))
  }

  /** A phase bundles a batch of graph nodes. Without a graph we fall back to a
   *  naive string split so the existing UserGoal flow keeps working. */
  private extractPhaseIntents(goalDescription: string): { title: string; nodes: readonly PlannerGraphNode[] }[] {
    if (this.graphNodes.length > 0) {
      const batches: PlannerGraphNode[][] = []
      for (let i = 0; i < this.graphNodes.length; i += PHASE_BATCH_SIZE) {
        batches.push(this.graphNodes.slice(i, i + PHASE_BATCH_SIZE))
      }
      return batches.map((batch, index) => ({
        title: `Phase ${index + 1}: ${batch.map((n) => n.label).join(", ")}`,
        nodes: batch,
      }))
    }

    // Fallback: structural split on the goal description
    const words = goalDescription.toLowerCase().split(/\s+/)
    if (words.length <= 5) return [{ title: goalDescription, nodes: [] }]

    const mid = Math.ceil(words.length / 2)
    return [
      { title: `Phase 1: ${words.slice(0, mid).join(" ")}`, nodes: [] },
      { title: `Phase 2: ${words.slice(mid).join(" ")}`, nodes: [] },
    ]
  }

  private mapNodeKindToRole(kind: string): PlanNode["ownerRole"] {
    switch (kind) {
      case "terminal":
        return "programmer"
      case "browser":
        return "researcher"
      case "map":
        return "architect"
      default:
        return "programmer"
    }
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
