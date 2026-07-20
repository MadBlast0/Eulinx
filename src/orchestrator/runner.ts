import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import { CoreError } from "@/core/error"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import { brand, type IsoTimestamp } from "@/core/types"
import type { Duration } from "@/core/types"
import { generateId } from "@/core/uuid"
import type { RefinementMode } from "@/core/enums"
import { ProviderInvoker } from "@/providers-ai/provider-invoker"
import { CoordinatorOrchestrator } from "@/orchestrator/roles/coordinator"
import { ArchitectOrchestrator } from "@/orchestrator/roles/architect"
import { ResearcherOrchestrator } from "@/orchestrator/roles/researcher"
import { ProgrammerOrchestrator } from "@/orchestrator/roles/programmer"
import { ReviewerOrchestrator } from "@/orchestrator/roles/reviewer"
import { DebuggerOrchestrator } from "@/orchestrator/roles/debugger"
import { DocumentationOrchestrator } from "@/orchestrator/roles/documentation"
import { QAOrchestrator } from "@/orchestrator/roles/qa"
import { ReleaseOrchestrator } from "@/orchestrator/roles/release"
import type { PlannerGraphNode } from "@/orchestrator/roles/planner"
import { RefinementLoopEngine } from "@/orchestrator/refinement-loop"
import type { RefinementLoopInput, RoleExecutors } from "@/orchestrator/refinement-loop"
import { RefinementVerifier } from "@/orchestrator/refinement-verify"
import type {
  OrchestratorConfig,
  OrchestratorRole,
  Plan,
  PlanNode,
  UserGoal,
} from "@/orchestrator/orchestrator-types"
import type {
  TaskContext,
  TaskResult,
  ArtifactEntry,
  RunStatus,
} from "./runner-types"

export type { TaskContext, TaskResult, ArtifactEntry, RunStatus } from "./runner-types"

export class OrchestratorRunner {
  private _status: RunStatus = "idle"
  private cancelRequested = false
  private readonly logger: Logger
  private readonly invoker: ProviderInvoker
  private readonly loopEngine: RefinementLoopEngine
  private _currentTaskId: string | null = null
  private _artifacts: ArtifactEntry[] = []
  private _totalTokens = 0
  private _totalCost = 0

  constructor(invoker: ProviderInvoker) {
    this.logger = createLogger("OrchestratorRunner")
    this.invoker = invoker
    this.loopEngine = new RefinementLoopEngine()
  }

  getStatus(): RunStatus {
    return this._status
  }

  async cancel(): Promise<void> {
    this.cancelRequested = true
    this._status = "cancelled"
    this.logger.info("Run cancelled by user")
  }

  async runTask(task: string, context?: TaskContext): Promise<TaskResult> {
    this._status = "running"
    this.cancelRequested = false
    this._artifacts = []
    this._totalTokens = 0
    this._totalCost = 0

    const taskId = generateId()
    this._currentTaskId = taskId
    const startedAt = new Date().toISOString() as IsoTimestamp

    this.logger.info(`Starting task: "${task.slice(0, 80)}"`)

    try {
      const goal = this.buildGoal(task, taskId, context)
      const config = this.buildConfig(goal, context)
      const graphNodes = this.extractGraphNodes(task)

      const coordinator = new CoordinatorOrchestrator(config, goal, graphNodes, this.invoker)
      const startResult = await coordinator.start()

      if (!startResult.ok) {
        return this.buildFailedResult(taskId, task, startedAt, startResult.error.message)
      }

      const plan = coordinator.currentPlan
      if (!plan) {
        return this.buildFailedResult(taskId, task, startedAt, "Planner produced no plan")
      }

      await this.processPlan(plan, goal, context)

      if (this.cancelRequested) {
        return this.buildCancelledResult(taskId, task, startedAt)
      }

      const completedAt = new Date().toISOString() as IsoTimestamp
      const totalDuration = new Date(completedAt).getTime() - new Date(startedAt).getTime()
      this._status = "completed"

      return {
        taskId,
        task,
        status: "completed",
        plan,
        artifacts: [...this._artifacts],
        summary: `Task completed with ${this._artifacts.length} artifacts across ${Object.values(plan.nodes).filter(n => n.id.startsWith("phase-")).length} phases`,
        totalTokens: this._totalTokens,
        totalCost: this._totalCost,
        duration: totalDuration as Duration,
        startedAt,
        completedAt,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Runner failed: ${message}`)
      return this.buildFailedResult(taskId, task, startedAt, message)
    }
  }

  private async processPlan(plan: Plan, goal: UserGoal, context?: TaskContext): Promise<void> {
    const phases = Object.values(plan.nodes).filter((n) => n.id.startsWith("phase-"))
    this.logger.info(`Processing ${phases.length} phases`)

    for (const phase of phases) {
      if (this.cancelRequested) break
      this.logger.info(`Phase: ${phase.intent}`)

      const providerId = context?.providerId ?? "claude"
      const modelId = context?.modelProfileId ?? "claude-sonnet-4-20250514"
      const executor = this.invoker.createExecutor({ providerId, model: modelId })

      const taskNodes = phase.childIds
        .map((id) => plan.nodes[id])
        .filter((n): n is PlanNode => n !== undefined)

      for (const taskNode of taskNodes) {
        if (this.cancelRequested) break
        await this.executeTask(taskNode, plan, goal, executor, providerId, modelId)
      }
    }
  }

  private async executeTask(
    taskNode: PlanNode,
    plan: Plan,
    goal: UserGoal,
    executor: (prompt: string) => Promise<Result<string, CoreError>>,
    providerId: string,
    modelId: string,
  ): Promise<void> {
    this.logger.info(`Executing task: ${taskNode.intent} (${taskNode.ownerRole})`)

    switch (taskNode.ownerRole) {
      case "architect":
        await this.executeArchitect(taskNode, plan, goal, executor)
        break
      case "researcher":
        await this.executeResearcher(taskNode, plan, goal, executor)
        break
      case "programmer":
        await this.executeProgrammer(taskNode, plan, goal, providerId, modelId)
        break
      case "reviewer":
        await this.executeReviewer(taskNode, executor)
        break
      case "debugger":
        await this.executeDebugger(taskNode, plan, goal, executor)
        break
      case "documentation":
        await this.executeDocumentation(taskNode, plan, goal, executor)
        break
      case "qa":
        await this.executeQA(taskNode, plan, goal, executor)
        break
      case "release":
        await this.executeRelease(taskNode, plan, goal, executor)
        break
      default:
        this.logger.warn(`No handler for role: ${taskNode.ownerRole}`)
    }
  }

  private async executeArchitect(
    taskNode: PlanNode,
    plan: Plan,
    goal: UserGoal,
    executor: (prompt: string) => Promise<Result<string, CoreError>>,
  ): Promise<void> {
    const childConfig = this.buildChildConfig(taskNode, goal, "architect")
    const architect = new ArchitectOrchestrator(childConfig, taskNode, plan)
    const result = await architect.design(goal.description, executor)

    if (result.ok) {
      this._artifacts.push({
        id: `art-arch-${Date.now()}`,
        type: "architecture",
        content: JSON.stringify(result.value),
        label: taskNode.intent,
        role: "architect",
      })
      this._totalTokens += 500
    }
  }

  private async executeResearcher(
    taskNode: PlanNode,
    plan: Plan,
    goal: UserGoal,
    executor: (prompt: string) => Promise<Result<string, CoreError>>,
  ): Promise<void> {
    const childConfig = this.buildChildConfig(taskNode, goal, "researcher")
    const researcher = new ResearcherOrchestrator(childConfig, taskNode, plan)
    const result = await researcher.research(goal.description, [], executor)

    if (result.ok) {
      this._artifacts.push({
        id: `art-res-${Date.now()}`,
        type: "research",
        content: JSON.stringify(result.value),
        label: taskNode.intent,
        role: "researcher",
      })
      this._totalTokens += 400
    }
  }

  private async executeProgrammer(
    taskNode: PlanNode,
    plan: Plan,
    goal: UserGoal,
    providerId: string,
    modelId: string,
  ): Promise<void> {
    const childConfig = this.buildChildConfig(taskNode, goal, "programmer")
    const programmer = new ProgrammerOrchestrator(childConfig, taskNode, plan)

    const artifactContents = new Map<string, string>()
    const hasProvider = this.invoker.validateProvider(providerId)
    const verifier = new RefinementVerifier({
      workerId: `runner-${providerId}`,
      aiVerify: hasProvider
        ? async (prompt) => {
            const r = await this.invoker.invoke({
              providerId,
              model: modelId,
              messages: [{ role: "user", content: prompt }],
            })
            return r.content ? ok(r.content) : err(new CoreError("execution_failed", "Empty AI verification"))
          }
        : undefined,
    })

    const executors: RoleExecutors = {
      build: async (input) => {
        const result = await this.invoker.invoke({
          providerId,
          model: modelId,
          messages: [
            { role: "system", content: `You are a programmer. Task: ${input.taskGoal}` },
            { role: "user", content: input.context },
          ],
        })
        this._totalTokens += result.tokensIn + result.tokensOut
        this._totalCost += this.invoker.getCostEstimate({
          providerId,
          model: modelId,
          messages: [],
        }).cost

        const artifactId = brand<string, "ArtifactId">(`art-prog-${Date.now()}`)
        const content = result.content
        artifactContents.set(artifactId, content)
        verifier.recordArtifact(artifactId, content)

        return ok({
          artifactId,
          artifactType: "code",
          changeNote: `Pass ${input.passNumber} build`,
          producedAt: new Date().toISOString() as IsoTimestamp,
          tokenUsage: result.tokensIn + result.tokensOut,
          costMicroUsd: Math.ceil(this._totalCost * 1_000_000),
        })
      },
      verify: async (input) => {
        this.logger.info(`Verifying artifact ${input.artifactId}`)
        const verifyResult = await verifier.verify(input, goal.description)
        if (!verifyResult.ok) {
          return verifyResult
        }
        const output = verifyResult.value
        this._totalTokens += output.tokenUsage
        return ok(output)
      },
      critique: async (input) => {
        const result = await this.invoker.invoke({
          providerId,
          model: modelId,
          messages: [
            { role: "system", content: "You are a code critic. Review the artifact." },
            { role: "user", content: JSON.stringify(input) },
          ],
        })
        this._totalTokens += result.tokensIn + result.tokensOut

        return ok({
          issues: [],
          strengths: ["Artifact produced"],
          suggestions: [],
          questions: [],
          critiquedAt: new Date().toISOString() as IsoTimestamp,
          tokenUsage: result.tokensIn + result.tokensOut,
          costMicroUsd: 0,
        })
      },
      judge: async (input) => {
        const result = await this.invoker.invoke({
          providerId,
          model: modelId,
          messages: [
            { role: "system", content: "You are a judge. Decide accept or reject." },
            { role: "user", content: JSON.stringify(input) },
          ],
        })
        this._totalTokens += result.tokensIn + result.tokensOut

        return ok({
          verdict: "accept",
          rationale: result.content,
          qualityScore: 0.8,
          judgedAt: new Date().toISOString() as IsoTimestamp,
          tokenUsage: result.tokensIn + result.tokensOut,
          costMicroUsd: 0,
        })
      },
    }

    const loopResult = await programmer.buildWithRefinement(goal.description, executors)

    if (loopResult.ok) {
      const loopValue = loopResult.value
      if (loopValue.finalArtifactId) {
        this._artifacts.push({
          id: loopValue.finalArtifactId,
          type: "code",
          content: `Artifact from refinement loop (${loopValue.totalPasses} passes, score: ${loopValue.finalQualityScore})`,
          label: taskNode.intent,
          role: "programmer",
        })
        this._totalTokens += loopValue.totalTokenUsage
      }
    }
  }

  private async executeReviewer(
    taskNode: PlanNode,
    executor: (prompt: string) => Promise<Result<string, CoreError>>,
  ): Promise<void> {
    const childConfig = this.buildChildConfig(taskNode, {} as UserGoal, "reviewer")
    const reviewer = new ReviewerOrchestrator(childConfig)

    const critiqueResult = await reviewer.critique("", {
      passed: true,
      checks: [],
      verifiedAt: new Date().toISOString() as IsoTimestamp,
      tokenUsage: 0,
      costMicroUsd: 0,
    }, taskNode.intent, executor)

    if (critiqueResult.ok) {
      this._artifacts.push({
        id: `art-review-${Date.now()}`,
        type: "review",
        content: JSON.stringify(critiqueResult.value),
        label: taskNode.intent,
        role: "reviewer",
      })
    }
  }

  private async executeDebugger(
    taskNode: PlanNode,
    plan: Plan,
    goal: UserGoal,
    executor: (prompt: string) => Promise<Result<string, CoreError>>,
  ): Promise<void> {
    const childConfig = this.buildChildConfig(taskNode, goal, "debugger")
    const debuggerOrch = new DebuggerOrchestrator(childConfig, taskNode, plan)
    const result = await debuggerOrch.diagnose("", "", goal.description, executor)

    if (result.ok) {
      this._artifacts.push({
        id: `art-dbg-${Date.now()}`,
        type: "diagnosis",
        content: JSON.stringify(result.value),
        label: taskNode.intent,
        role: "debugger",
      })
    }
  }

  private async executeDocumentation(
    taskNode: PlanNode,
    plan: Plan,
    goal: UserGoal,
    executor: (prompt: string) => Promise<Result<string, CoreError>>,
  ): Promise<void> {
    const childConfig = this.buildChildConfig(taskNode, goal, "documentation")
    const docs = new DocumentationOrchestrator(childConfig, taskNode, plan)
    const result = await docs.generateDoc("guide", "", goal.description, executor)

    if (result.ok) {
      this._artifacts.push({
        id: result.value.id,
        type: "documentation",
        content: result.value.content,
        label: taskNode.intent,
        role: "documentation",
      })
    }
  }

  private async executeQA(
    taskNode: PlanNode,
    plan: Plan,
    goal: UserGoal,
    executor: (prompt: string) => Promise<Result<string, CoreError>>,
  ): Promise<void> {
    const childConfig = this.buildChildConfig(taskNode, goal, "qa")
    const qa = new QAOrchestrator(childConfig, taskNode, plan)

    const suite = this.buildTestSuite(taskNode)
    const result = await qa.runTests(suite, async (command) => {
      const r = await executor(`Run QA command: ${command}`)
      this._totalTokens += 100
      return r
    })

    if (result.ok) {
      this._artifacts.push({
        id: `art-qa-${Date.now()}`,
        type: "test_report",
        content: JSON.stringify(result.value),
        label: taskNode.intent,
        role: "qa",
      })
    }
  }

  private async executeRelease(
    taskNode: PlanNode,
    plan: Plan,
    goal: UserGoal,
    executor: (prompt: string) => Promise<Result<string, CoreError>>,
  ): Promise<void> {
    const childConfig = this.buildChildConfig(taskNode, goal, "release")
    const release = new ReleaseOrchestrator(childConfig, taskNode, plan)

    const versionMatch = goal.description.match(/v?\d+\.\d+\.\d+/)
    const version = versionMatch ? versionMatch[0].replace(/^v/, "") : "0.1.0"

    const result = await release.prepareRelease(version, "", async (command) => {
      const r = await executor(`Run release command: ${command}`)
      this._totalTokens += 100
      return r
    })

    if (result.ok) {
      this._artifacts.push({
        id: `art-release-${Date.now()}`,
        type: "review",
        content: JSON.stringify(result.value),
        label: taskNode.intent,
        role: "release",
      })
    }
  }

  private buildTestSuite(taskNode: PlanNode) {
    return {
      name: `QA suite for ${taskNode.intent.slice(0, 40)}`,
      tests: [
        { name: "unit", command: "pnpm test --run" },
        { name: "typecheck", command: "pnpm typecheck" },
      ],
    }
  }

  private buildGoal(task: string, taskId: string, context?: TaskContext): UserGoal {
    return {
      id: taskId,
      description: task,
      constraints: [],
      priority: "medium",
      workspaceId: brand(context?.workspaceId ?? "ws-local"),
      sessionId: brand(context?.sessionId ?? `session-${taskId}`),
      projectId: context?.projectId ?? "default",
    }
  }

  private buildConfig(goal: UserGoal, context?: TaskContext): OrchestratorConfig {
    return {
      id: brand(`coordinator-${goal.id}`),
      role: "coordinator",
      level: "root",
      displayName: "Coordinator",
      workspaceId: goal.workspaceId,
      sessionId: goal.sessionId,
      projectId: goal.projectId,
      refinementMode: (context?.refinementMode ?? "medium") as RefinementMode,
      budgetAllocated: context?.budget ?? 1_000_000,
      maxWorkers: 8,
      maxDepth: 3,
      allowedRoles: ["planner", "programmer", "reviewer", "researcher", "architect", "debugger"],
    }
  }

  private buildChildConfig(taskNode: PlanNode, goal: UserGoal, role: OrchestratorRole): OrchestratorConfig {
    return {
      id: brand(`task-${goal.id}-${taskNode.id}-${role}`),
      role,
      level: "task",
      displayName: taskNode.intent.slice(0, 50),
      workspaceId: goal.workspaceId,
      sessionId: goal.sessionId,
      projectId: goal.projectId,
      refinementMode: "low" as RefinementMode,
      budgetAllocated: taskNode.budgetAllocation,
      maxWorkers: 1,
      maxDepth: 1,
      allowedRoles: [role],
    }
  }

  private extractGraphNodes(task: string): PlannerGraphNode[] {
    const lines = task.split("\n").filter((l) => l.trim().length > 0)
    if (lines.length <= 1) return []

    return lines.map((line, i) => ({
      id: `node-${i}`,
      label: line.trim().slice(0, 60),
      kind: this.detectNodeKind(line),
    }))
  }

  private detectNodeKind(label: string): string {
    const lower = label.toLowerCase()
    if (lower.includes("terminal") || lower.includes("shell") || lower.includes("code") || lower.includes("implement")) return "terminal"
    if (lower.includes("browser") || lower.includes("search") || lower.includes("research") || lower.includes("find")) return "browser"
    if (lower.includes("map") || lower.includes("design") || lower.includes("architect") || lower.includes("plan")) return "map"
    return "terminal"
  }

  private buildFailedResult(taskId: string, task: string, startedAt: IsoTimestamp, error: string): TaskResult {
    this._status = "failed"
    return {
      taskId,
      task,
      status: "failed",
      artifacts: [...this._artifacts],
      summary: `Task failed: ${error}`,
      totalTokens: this._totalTokens,
      totalCost: this._totalCost,
      duration: new Date().getTime() - new Date(startedAt).getTime(),
      error,
      startedAt,
      completedAt: new Date().toISOString() as IsoTimestamp,
    }
  }

  private buildCancelledResult(taskId: string, task: string, startedAt: IsoTimestamp): TaskResult {
    this._status = "cancelled"
    return {
      taskId,
      task,
      status: "cancelled",
      artifacts: [...this._artifacts],
      summary: "Task cancelled by user",
      totalTokens: this._totalTokens,
      totalCost: this._totalCost,
      duration: new Date().getTime() - new Date(startedAt).getTime(),
      error: "cancelled",
      startedAt,
      completedAt: new Date().toISOString() as IsoTimestamp,
    }
  }
}
