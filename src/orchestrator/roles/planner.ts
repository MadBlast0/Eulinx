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

/** Shape expected from the LLM planner response (narrowed from `unknown`). */
interface LLMPlan {
  readonly phases: readonly unknown[]
}

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
  // LLM-driven planning
  // -----------------------------------------------------------------------

  /**
   * Decompose the goal into a plan tree using the LLM. The model returns a
   * JSON plan (phases → tasks → budgets) which we normalize into PlanNodes.
   * On any parse/validation failure we fall back to the structural
   * decomposition so the orchestrator always receives a usable plan.
   */
  async planWithLlm(
    executor: (prompt: string) => Promise<Result<string, CoreError>>,
    feedback?: string,
  ): Promise<Result<Plan, CoreError>> {
    const prompt = this.buildPlanPrompt(feedback)
    const result = await executor(prompt)
    if (!result.ok) {
      this.logger.warn(`LLM planning failed (${result.error.message}); using structural fallback`)
      return this.runStructuralPlan()
    }

    const parsed = this.parsePlan(result.value)
    if (!parsed) {
      this.logger.warn("Failed to parse LLM plan; using structural fallback")
      return this.runStructuralPlan()
    }

    const built = this.buildPlanFromLlm(parsed)
    if (!built.ok) {
      this.logger.warn(`LLM plan invalid (${built.error.message}); using structural fallback`)
      return this.runStructuralPlan()
    }

    this.plan = built.value
    this.phaseNodes = built.value.nodes
      ? Object.values(built.value.nodes).filter((n) => n.id.startsWith("phase-"))
      : []
    return ok(built.value)
  }

  /** Re-plan a phase using LLM feedback (revision path). */
  async revisePlanWithLlm(
    phaseId: string,
    feedback: string,
    executor: (prompt: string) => Promise<Result<string, CoreError>>,
  ): Promise<Result<void, CoreError>> {
    const result = await this.planWithLlm(executor, feedback)
    if (!result.ok) return err(result.error)

    const phase = result.value.nodes[phaseId]
    if (!phase) return err(new CoreError("validation_error", `Phase ${phaseId} not in revised plan`))

    this.plan = result.value
    this.phaseNodes = Object.values(result.value.nodes).filter((n) => n.id.startsWith("phase-"))
    return ok(undefined)
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

  /** Run the existing structural decomposition and return the resulting Plan. */
  private runStructuralPlan(): Result<Plan, CoreError> {
    const phaseSpecs = this.extractPhaseIntents(this.goal.description)
    const phases = this.decomposeGoal(this.goal, phaseSpecs)
    this.phaseNodes = phases

    const nodes: Record<string, PlanNode> = {}
    phases.forEach((phase, index) => {
      nodes[phase.id] = phase
      const phaseNodesForTasks = phaseSpecs[index]?.nodes ?? []
      const tasks = this.decomphaseTask(this.goal.id, index, phase.intent, phaseNodesForTasks)
      for (const task of tasks) {
        nodes[task.id] = task
      }
    })

    const plan: Plan = {
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
    this.plan = plan
    return ok(plan)
  }

  private buildPlanPrompt(feedback?: string): string {
    const feedbackSection = feedback
      ? `\n\n## Revision feedback from previous attempt\n${feedback}\n\nRevise the plan to address it.`
      : ""
    return [
      `You are a planning agent. Decompose the user goal into a tree of phases and tasks.`,
      `Each phase has a title and a list of tasks. Each task has an intent, an owner role`,
      `(one of: programmer, researcher, architect, reviewer, debugger, documentation, qa, release),`,
      `and a budget allocation (a positive integer).`,
      ``,
      `## Goal`,
      this.goal.description,
      ``,
      `## Constraints`,
      this.goal.constraints.length > 0 ? this.goal.constraints.map((c) => `- ${c}`).join("\n") : "None",
      ``,
      `## Output format`,
      `Return ONLY JSON:`,
      `{`,
      `  "phases": [{"title": "...", "tasks": [{"intent": "...", "ownerRole": "programmer", "budget": 100000}]}]`,
      `}`,
      feedbackSection,
    ].join("\n")
  }

  /** Parse the LLM's JSON plan. Narrow the unknown payload defensively. */
  private parsePlan(raw: string): LLMPlan | null {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return null
    }
    if (typeof parsed !== "object" || parsed === null) return null
    const obj = parsed as Record<string, unknown>
    if (!Array.isArray(obj.phases)) return null
    return { phases: obj.phases as unknown[] }
  }

  private buildPlanFromLlm(llm: LLMPlan): Result<Plan, CoreError> {
    const now = new Date().toISOString() as IsoTimestamp
    const nodes: Record<string, PlanNode> = {}
    let phaseIndex = 0

    for (const rawPhase of llm.phases) {
      if (typeof rawPhase !== "object" || rawPhase === null) continue
      const phaseObj = rawPhase as Record<string, unknown>
      const title = typeof phaseObj.title === "string" ? phaseObj.title : `Phase ${phaseIndex + 1}`
      const phaseId = `phase-${this.goal.id}-${phaseIndex}`
      const tasksRaw = Array.isArray(phaseObj.tasks) ? phaseObj.tasks : []

      const childIds: string[] = []
      tasksRaw.forEach((rawTask, ti) => {
        if (typeof rawTask !== "object" || rawTask === null) return
        const taskObj = rawTask as Record<string, unknown>
        const intent = typeof taskObj.intent === "string" ? taskObj.intent : `Task ${ti + 1}`
        const ownerRole = this.narrowRole(taskObj.ownerRole)
        const budget = typeof taskObj.budget === "number" && taskObj.budget > 0
          ? Math.floor(taskObj.budget)
          : this.plannerConfig.defaultTaskBudget
        const taskId = `${phaseId}-task-${ti}`
        childIds.push(taskId)
        nodes[taskId] = {
          id: taskId,
          intent,
          scope: `${title} > ${intent}`,
          ownerOrchestratorId: this.id,
          ownerRole,
          childIds: [],
          dependencies: ti > 0 ? [`${phaseId}-task-${ti - 1}`] : [],
          checklist: this.generateChecklist(intent),
          budgetAllocation: budget,
          estimatedSubtasks: 1,
          state: "pending" as const,
          orderConstraint: "sequential" as const,
          createdAt: now,
          updatedAt: now,
        }
      })

      nodes[phaseId] = {
        id: phaseId,
        intent: title,
        scope: title,
        ownerOrchestratorId: this.id,
        ownerRole: "coordinator" as const,
        childIds,
        dependencies: phaseIndex > 0 ? [`phase-${this.goal.id}-${phaseIndex - 1}`] : [],
        checklist: [],
        budgetAllocation: Math.floor(this.plannerConfig.defaultTaskBudget * 1.5),
        estimatedSubtasks: childIds.length,
        state: "pending" as const,
        orderConstraint: phaseIndex === 0 ? "parallel" as const : "sequential" as const,
        createdAt: now,
        updatedAt: now,
      }
      phaseIndex++
    }

    if (phaseIndex === 0) {
      return err(new CoreError("validation_error", "LLM produced no usable phases"))
    }

    const plan: Plan = {
      id: `plan-${this.goal.id}`,
      goal: this.goal.description,
      rootOrchestratorId: this.id,
      nodes,
      totalBudget: this.goal.metadata?.budget as number ?? 1_000_000,
      spentBudget: 0,
      version: 1,
      createdAt: now,
      updatedAt: now,
    }
    return ok(plan)
  }

  private narrowRole(value: unknown): PlanNode["ownerRole"] {
    const allowed: readonly PlanNode["ownerRole"][] = [
      "planner", "programmer", "reviewer", "researcher", "architect",
      "debugger", "documentation", "qa", "release", "coordinator",
    ]
    return allowed.includes(value as PlanNode["ownerRole"])
      ? (value as PlanNode["ownerRole"])
      : "programmer"
  }

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

  /** Groups graph nodes by their kind to produce one phase per distinct kind
   *  category (e.g. "terminal", "browser", "worker"). When no graph nodes are
   *  available we fall back to a naive string split on the goal description. */
  private extractPhaseIntents(goalDescription: string): { title: string; nodes: readonly PlannerGraphNode[] }[] {
    if (this.graphNodes.length > 0) {
      // One phase per node kind — much more meaningful than fixed-size batches
      const groups = new Map<string, PlannerGraphNode[]>()
      for (const node of this.graphNodes) {
        const group = groups.get(node.kind)
        if (group) {
          group.push(node)
        } else {
          groups.set(node.kind, [node])
        }
      }
      return Array.from(groups.entries()).map(([kind, nodes]) => ({
        title: `${kind.charAt(0).toUpperCase() + kind.slice(1)}: ${nodes.map((n) => n.label).join(", ")}`,
        nodes,
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
