/**
 * P15-ORCH-PROGRAMMER — Programmer (Builder) Orchestrator
 *
 * The artifact-producing AI worker. Turns intent, context, prior draft, and
 * critic feedback into concrete artifacts (code, markdown, JSON, plans, patches).
 * MUST NOT mutate the project directly — produces artifacts; runtime applies them.
 * From Builder-Part01 through Part04, AIArchitecture-Part03 §Builder.
 */

import type { Result } from "@/core/result"
import { ok } from "@/core/result"
import { CoreError } from "@/core/error"

import { BaseOrchestrator } from "../orchestrator-base"
import type {
  OrchestratorConfig,
  PlanNode,
  Plan,
  ProgrammerConfig,
} from "../orchestrator-types"
import { RefinementLoopEngine } from "../refinement-loop"
import type {
  RefinementLoopInput,
  RefinementLoopResult,
  RoleExecutors,
  BuildInput,
  BuilderOutput,
} from "../refinement-loop"

// ---------------------------------------------------------------------------
// Programmer Orchestrator
// ---------------------------------------------------------------------------

export class ProgrammerOrchestrator extends BaseOrchestrator {
  private readonly programmerConfig: ProgrammerConfig
  private readonly taskNode: PlanNode
  private readonly refinementLoop: RefinementLoopEngine
  private loopResult: RefinementLoopResult | null = null

  constructor(
    config: OrchestratorConfig,
    taskNode: PlanNode,
    _plan: Plan,
    programmerConfig?: Partial<ProgrammerConfig>,
  ) {
    super(config)
    this.taskNode = taskNode
    this.programmerConfig = {
      allowedFileExtensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".md"],
      enforceTests: true,
      maxArtifactSizeBytes: 1024 * 1024,
      ...programmerConfig,
    }
    this.refinementLoop = new RefinementLoopEngine()
  }

  // -----------------------------------------------------------------------
  // Identity
  // -----------------------------------------------------------------------

  describe(): string {
    return `Programmer: building artifact for "${this.taskNode.intent.slice(0, 50)}"`
  }

  getLoopResult(): RefinementLoopResult | null {
    return this.loopResult
  }

  // -----------------------------------------------------------------------
  // Lifecycle hooks
  // -----------------------------------------------------------------------

  protected async onPlan(): Promise<Result<void, CoreError>> {
    this.logger.info(`Programmer planning: ${this.taskNode.intent}`)
    return ok(undefined)
  }

  protected async onDelegate(): Promise<Result<void, CoreError>> {
    // The programmer runs the refinement loop, not delegation
    return ok(undefined)
  }

  protected async onComplete(): Promise<Result<void, CoreError>> {
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Build with refinement (Builder-Part01 §Artifact Production)
  // -----------------------------------------------------------------------

  async buildWithRefinement(
    context: string,
    executors: RoleExecutors,
  ): Promise<Result<RefinementLoopResult, CoreError>> {
    const input: RefinementLoopInput = {
      orchestratorId: this.id,
      mode: this.config.refinementMode,
      budgetMicroUsd: this.config.budgetAllocated,
      taskGoal: this.taskNode.intent,
      initialContext: context,
    }

    const result = await this.refinementLoop.run(input, executors)
    if (result.ok) {
      this.loopResult = result.value
      if (result.value.finalArtifactId) {
        this.addArtifact(result.value.finalArtifactId)
      }
      this.spendBudget(result.value.totalCostMicroUsd)
    }
    return result
  }

  // -----------------------------------------------------------------------
  // Direct artifact production (no refinement, single pass)
  // -----------------------------------------------------------------------

  async buildDirect(
    context: string,
    executor: (input: BuildInput) => Promise<Result<BuilderOutput, CoreError>>,
  ): Promise<Result<BuilderOutput, CoreError>> {
    const result = await executor({
      orchestratorId: this.id,
      taskGoal: this.taskNode.intent,
      context,
      passNumber: 1,
    })

    if (result.ok) {
      this.addArtifact(result.value.artifactId)
      this.spendBudget(result.value.costMicroUsd)
    }

    return result
  }

  // -----------------------------------------------------------------------
  // Artifact validation (Builder-Part04 §Implementation Checklist)
  // -----------------------------------------------------------------------

  validateArtifactType(content: string, expectedType: string): boolean {
    switch (expectedType) {
      case "json":
        try { JSON.parse(content); return true } catch { console.warn('eulinx: programmer: invalid JSON content'); return false }
      case "markdown":
        return content.trim().length > 0
      case "code":
        return content.includes("function") || content.includes("class") || content.includes("const") || content.includes("export")
      default:
        return true
    }
  }

  validateArtifactSize(content: string): boolean {
    return Buffer.byteLength(content, "utf-8") <= this.programmerConfig.maxArtifactSizeBytes
  }
}
