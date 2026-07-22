/**
 * P15-ORCH — Refinement Loop Engine
 *
 * The signature feature of Eulinx: Builder → Verifier → Critic → Judge loop
 * that iteratively upgrades a draft artifact.
 * From RefinementLoop-Part01 through Part07.
 *
 * Stopping rules (RefinementLoop-Part04):
 *   1. Judge returns accept.
 *   2. Iteration count reaches mode's cap.
 *   3. Token/cost budget exhausted.
 *   4. Fatal, non-recoverable error in a phase.
 *
 * Budget enforcement: before each pass, query remaining budget.
 * No infinite loops: runtime enforces cap even if Judge misbehaves.
 */

import type { Result } from "@/core/result"
import { ok } from "@/core/result"
import { CoreError } from "@/core/error"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { ArtifactId, IsoTimestamp, JsonObject } from "@/core/types"
import type { RefinementMode } from "@/core/enums"

import type {
  OrchestratorId,
  RefinementLoopState,
  RefinementPassRecord,
  OrchestratorEvent,
  OrchestratorEventType,
  BuilderOutput,
  VerifierOutput,
  CriticOutput,
  JudgeOutput,
} from "./orchestrator-types"
import { REFINEMENT_MODE_CAPS } from "./orchestrator-types"

// Re-export role output types for consumers
export type {
  BuilderOutput,
  VerifierOutput,
  VerificationCheck,
  CriticOutput,
  CriticIssue,
  JudgeOutput,
} from "./orchestrator-types"

// ---------------------------------------------------------------------------
// Refinement Loop Inputs
// ---------------------------------------------------------------------------

export interface RefinementLoopInput {
  readonly orchestratorId: OrchestratorId
  readonly mode: RefinementMode
  readonly budgetMicroUsd: number
  readonly taskGoal: string
  readonly initialContext: string
  readonly priorDraft?: string
  readonly upstreamArtifacts?: readonly ArtifactId[]
}

// ---------------------------------------------------------------------------
// Refinement Loop Result
// ---------------------------------------------------------------------------

export interface RefinementLoopResult {
  readonly accepted: boolean
  readonly finalArtifactId?: ArtifactId
  readonly finalQualityScore: number
  readonly totalPasses: number
  readonly totalTokenUsage: number
  readonly totalCostMicroUsd: number
  readonly passHistory: readonly RefinementPassRecord[]
  readonly exitReason: "accepted" | "budget_exceeded" | "cap_reached" | "error" | "stuck_detection"
}

// ---------------------------------------------------------------------------
// Role Executors (injected by the orchestrator)
// ---------------------------------------------------------------------------

export interface RoleExecutors {
  /** Execute the Builder role: produce or revise an artifact. */
  build: (input: BuildInput) => Promise<Result<BuilderOutput, CoreError>>
  /** Execute the Verifier role: run objective checks on the artifact. */
  verify: (input: VerifyInput) => Promise<Result<VerifierOutput, CoreError>>
  /** Execute the Critic role: produce structured feedback. */
  critique: (input: CritiqueInput) => Promise<Result<CriticOutput, CoreError>>
  /** Execute the Judge role: decide accept/reject/stop. */
  judge: (input: JudgeInput) => Promise<Result<JudgeOutput, CoreError>>
}

export interface BuildInput {
  readonly orchestratorId: OrchestratorId
  readonly taskGoal: string
  readonly context: string
  readonly priorDraft?: string
  readonly criticFeedback?: CriticOutput
  readonly verifierReport?: VerifierOutput
  readonly passNumber: number
}

export interface VerifyInput {
  readonly orchestratorId: OrchestratorId
  readonly artifactId: ArtifactId
  readonly artifactType: string
}

export interface CritiqueInput {
  readonly orchestratorId: OrchestratorId
  readonly artifactId: ArtifactId
  readonly verificationReport: VerifierOutput
  readonly taskGoal: string
  readonly passNumber: number
}

export interface JudgeInput {
  readonly orchestratorId: OrchestratorId
  readonly artifactId: ArtifactId
  readonly verificationReport: VerifierOutput
  readonly criticFeedback?: CriticOutput
  readonly taskGoal: string
  readonly acceptanceCriteria: readonly string[]
  readonly passNumber: number
  readonly priorCandidates: readonly ArtifactId[]
}

// ---------------------------------------------------------------------------
// Refinement Loop Engine
// ---------------------------------------------------------------------------

export class RefinementLoopEngine {
  private readonly logger: Logger
  private readonly _events: OrchestratorEvent[] = []

  constructor() {
    this.logger = createLogger("RefinementLoop")
  }

  // -----------------------------------------------------------------------
  // Main loop
  // -----------------------------------------------------------------------

  async run(
    input: RefinementLoopInput,
    executors: RoleExecutors,
  ): Promise<Result<RefinementLoopResult, CoreError>> {
    const maxPasses = REFINEMENT_MODE_CAPS[input.mode]
    let state = this.createInitialState(input, maxPasses)
    const passHistory: RefinementPassRecord[] = []
    let bestArtifactId: ArtifactId | undefined
    let bestQualityScore = 0
    let consecutiveNoImprove = 0
    let priorDraft = input.priorDraft
    let priorCandidates: ArtifactId[] = [...(input.upstreamArtifacts ?? [])]
    let lastFeedback: CriticOutput | undefined
    let lastVerifierReport: VerifierOutput | undefined

    this.logger.info(`Starting refinement loop: mode=${input.mode}, maxPasses=${maxPasses}, budget=${input.budgetMicroUsd}μ$`)

    for (let pass = 1; pass <= maxPasses; pass++) {
      // Budget check before each pass (RefinementLoop-Part04 §Budget Enforcement)
      if (state.budgetRemaining <= 0) {
        this.logger.warn("Budget exhausted before pass")
        return ok(this.buildResult(state, passHistory, bestArtifactId, bestQualityScore, "budget_exceeded"))
      }

      this.logger.info(`Pass ${pass}/${maxPasses}`)

      // --- BUILD Phase ---
      state = { ...state, phase: "building", currentPass: pass }
      this.emit("refinement.pass_started", { passNumber: pass })

      const buildResult = await executors.build({
        orchestratorId: input.orchestratorId,
        taskGoal: input.taskGoal,
        context: input.initialContext,
        priorDraft,
        criticFeedback: lastFeedback,
        verifierReport: lastVerifierReport,
        passNumber: pass,
      })

      if (!buildResult.ok) {
        this.logger.error(`Builder failed at pass ${pass}: ${buildResult.error.message}`)
        return ok(this.buildResult(state, passHistory, bestArtifactId, bestQualityScore, "error"))
      }

      const builderOutput = buildResult.value
      state = this.spendBudget(state, builderOutput.costMicroUsd)
      this.emit("refinement.built", { artifactId: builderOutput.artifactId, passNumber: pass })

      // --- VERIFY Phase ---
      state = { ...state, phase: "verifying" }

      const verifyResult = await executors.verify({
        orchestratorId: input.orchestratorId,
        artifactId: builderOutput.artifactId,
        artifactType: builderOutput.artifactType,
      })

      if (!verifyResult.ok) {
        this.logger.error(`Verifier failed at pass ${pass}: ${verifyResult.error.message}`)
        return ok(this.buildResult(state, passHistory, bestArtifactId, bestQualityScore, "error"))
      }

      const verifierOutput = verifyResult.value
      state = this.spendBudget(state, verifierOutput.costMicroUsd)
      lastVerifierReport = verifierOutput
      this.emit("refinement.verified", { passed: verifierOutput.passed, passNumber: pass })

      // If objective checks fail hard, route back to Builder (RefinementLoop-Part06 §Failure Routing)
      if (!verifierOutput.passed) {
        this.logger.info(`Verification failed at pass ${pass}, routing back to Builder`)
        priorDraft = `Previous draft failed verification:\n${verifierOutput.checks.filter((c: { passed: boolean }) => !c.passed).map((c: { name: string; details: string }) => `- ${c.name}: ${c.details}`).join("\n")}`
        // Skip Critic on objective failure to save tokens (RefinementLoop-Part06)
        const judgeInput: JudgeInput = {
          orchestratorId: input.orchestratorId,
          artifactId: builderOutput.artifactId,
          verificationReport: verifierOutput,
          taskGoal: input.taskGoal,
          acceptanceCriteria: [],
          passNumber: pass,
          priorCandidates: priorCandidates,
        }
        const judgeResult = await executors.judge(judgeInput)
        if (judgeResult.ok) {
          const judgeOutput = judgeResult.value
          state = this.spendBudget(state, judgeOutput.costMicroUsd)
          passHistory.push(this.buildPassRecord(pass, builderOutput, verifierOutput, undefined, judgeOutput))
          this.emit("refinement.judged", { verdict: judgeOutput.verdict, passNumber: pass })

          if (judgeOutput.verdict === "accept") {
            return ok(this.buildResult(state, passHistory, builderOutput.artifactId, judgeOutput.qualityScore, "accepted"))
          }
          if (judgeOutput.verdict === "stop") {
            return ok(this.buildResult(state, passHistory, bestArtifactId, bestQualityScore, "stuck_detection"))
          }
          // reject → continue loop
        }
        continue
      }

      // --- CRITIQUE Phase ---
      state = { ...state, phase: "critiquing" }

      const critiqueResult = await executors.critique({
        orchestratorId: input.orchestratorId,
        artifactId: builderOutput.artifactId,
        verificationReport: verifierOutput,
        taskGoal: input.taskGoal,
        passNumber: pass,
      })

      if (!critiqueResult.ok) {
        this.logger.error(`Critic failed at pass ${pass}: ${critiqueResult.error.message}`)
        return ok(this.buildResult(state, passHistory, bestArtifactId, bestQualityScore, "error"))
      }

      const criticOutput = critiqueResult.value
      state = this.spendBudget(state, criticOutput.costMicroUsd)
      lastFeedback = criticOutput
      this.emit("refinement.critiqued", { issueCount: criticOutput.issues.length, passNumber: pass })

      // --- JUDGE Phase ---
      state = { ...state, phase: "judging" }

      const judgeResult = await executors.judge({
        orchestratorId: input.orchestratorId,
        artifactId: builderOutput.artifactId,
        verificationReport: verifierOutput,
        criticFeedback: criticOutput,
        taskGoal: input.taskGoal,
        acceptanceCriteria: [],
        passNumber: pass,
        priorCandidates: priorCandidates,
      })

      if (!judgeResult.ok) {
        this.logger.error(`Judge failed at pass ${pass}: ${judgeResult.error.message}`)
        return ok(this.buildResult(state, passHistory, bestArtifactId, bestQualityScore, "error"))
      }

      const judgeOutput = judgeResult.value
      state = this.spendBudget(state, judgeOutput.costMicroUsd)
      this.emit("refinement.judged", { verdict: judgeOutput.verdict, qualityScore: judgeOutput.qualityScore, passNumber: pass })

      // Track best
      if (judgeOutput.qualityScore > bestQualityScore) {
        bestQualityScore = judgeOutput.qualityScore
        bestArtifactId = builderOutput.artifactId
        consecutiveNoImprove = 0
      } else {
        consecutiveNoImprove++
      }

      priorCandidates = [...priorCandidates, builderOutput.artifactId]
      priorDraft = undefined // Fresh build each pass with critic feedback

      passHistory.push(this.buildPassRecord(pass, builderOutput, verifierOutput, criticOutput, judgeOutput))

      // Stopping rules (RefinementLoop-Part04)
      if (judgeOutput.verdict === "accept") {
        this.logger.info(`Judge accepted at pass ${pass}`)
        return ok(this.buildResult(state, passHistory, builderOutput.artifactId, judgeOutput.qualityScore, "accepted"))
      }

      if (judgeOutput.verdict === "stop") {
        this.logger.info(`Judge stopped at pass ${pass}`)
        return ok(this.buildResult(state, passHistory, bestArtifactId, bestQualityScore, "stuck_detection"))
      }

      // Stuck detection (RefinementLoop-Part06 §Stuck Detection)
      if (consecutiveNoImprove >= 2) {
        this.logger.info(`Stuck detection: no improvement for 2 consecutive passes, stopping`)
        return ok(this.buildResult(state, passHistory, bestArtifactId, bestQualityScore, "stuck_detection"))
      }

      // reject → continue loop
    }

    // Cap reached (RefinementLoop-Part04 §Stopping Rules)
    this.logger.info(`Iteration cap reached (${maxPasses})`)
    return ok(this.buildResult(state, passHistory, bestArtifactId, bestQualityScore, "cap_reached"))
  }

  // -----------------------------------------------------------------------
  // State management
  // -----------------------------------------------------------------------

  private createInitialState(
    input: RefinementLoopInput,
    maxPasses: number,
  ): RefinementLoopState {
    return {
      mode: input.mode,
      phase: "idle",
      currentPass: 0,
      maxPasses,
      totalTokenUsage: 0,
      totalCostMicroUsd: 0,
      budgetRemaining: input.budgetMicroUsd,
      bestQualityScore: 0,
      consecutiveNoImprove: 0,
      passHistory: [],
      startedAt: new Date().toISOString() as IsoTimestamp,
      lastPhaseAt: new Date().toISOString() as IsoTimestamp,
    }
  }

  private spendBudget(state: RefinementLoopState, costMicroUsd: number): RefinementLoopState {
    return {
      ...state,
      totalCostMicroUsd: state.totalCostMicroUsd + costMicroUsd,
      totalTokenUsage: state.totalTokenUsage, // Updated by caller if needed
      budgetRemaining: Math.max(0, state.budgetRemaining - costMicroUsd),
      lastPhaseAt: new Date().toISOString() as IsoTimestamp,
    }
  }

  private buildPassRecord(
    passNumber: number,
    builderOutput: BuilderOutput,
    verifierOutput: VerifierOutput,
    criticOutput: CriticOutput | undefined,
    judgeOutput: JudgeOutput,
  ): RefinementPassRecord {
    return {
      passNumber,
      builderOutput,
      verifierOutput,
      criticOutput,
      judgeOutput,
      totalTokens: builderOutput.tokenUsage + verifierOutput.tokenUsage
        + (criticOutput?.tokenUsage ?? 0) + judgeOutput.tokenUsage,
      totalCostMicroUsd: builderOutput.costMicroUsd + verifierOutput.costMicroUsd
        + (criticOutput?.costMicroUsd ?? 0) + judgeOutput.costMicroUsd,
    }
  }

  private buildResult(
    state: RefinementLoopState,
    passHistory: readonly RefinementPassRecord[],
    bestArtifactId: ArtifactId | undefined,
    bestQualityScore: number,
    exitReason: RefinementLoopResult["exitReason"],
  ): RefinementLoopResult {
    return {
      accepted: exitReason === "accepted",
      finalArtifactId: bestArtifactId,
      finalQualityScore: bestQualityScore,
      totalPasses: state.currentPass,
      totalTokenUsage: state.totalTokenUsage,
      totalCostMicroUsd: state.totalCostMicroUsd,
      passHistory,
      exitReason,
    }
  }

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  private emit(type: OrchestratorEventType, data?: Record<string, unknown>): void {
    this._events.push({
      type,
      orchestratorId: "loop" as OrchestratorId,
      timestamp: new Date().toISOString() as IsoTimestamp,
      data: data as JsonObject | undefined,
    })
  }

  getEvents(): readonly OrchestratorEvent[] {
    return [...this._events]
  }
}
