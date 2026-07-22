/**
 * P15-ORCH-REVIEWER — Reviewer (Critic/Judge) Orchestrator
 *
 * Dual role: Critic produces structured feedback; Judge adjudicates accept/reject/stop.
 * From Critic-Part01 through Part04, Judge-Part01 through Part04,
 * AIArchitecture-Part03 §Critic and §Judge.
 */

import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import { CoreError } from "@/core/error"
import type { ArtifactId, IsoTimestamp } from "@/core/types"

import { BaseOrchestrator } from "../orchestrator-base"
import type {
  OrchestratorConfig,
  CriticOutput,
  JudgeOutput,
  VerifierOutput,
  ReviewerConfig,
} from "../orchestrator-types"

// ---------------------------------------------------------------------------
// Reviewer Orchestrator (Critic + Judge)
// ---------------------------------------------------------------------------

export class ReviewerOrchestrator extends BaseOrchestrator {
  private readonly reviewerConfig: ReviewerConfig

  constructor(
    config: OrchestratorConfig,
    reviewerConfig?: Partial<ReviewerConfig>,
  ) {
    super(config)
    this.reviewerConfig = {
      enableCritic: true,
      enableJudge: true,
      minQualityScore: 0.6,
      ...reviewerConfig,
    }
  }

  // -----------------------------------------------------------------------
  // Identity
  // -----------------------------------------------------------------------

  describe(): string {
    return `Reviewer: reviewing artifact quality`
  }

  // -----------------------------------------------------------------------
  // Lifecycle hooks
  // -----------------------------------------------------------------------

  protected async onPlan(): Promise<Result<void, CoreError>> {
    return ok(undefined)
  }

  protected async onDelegate(): Promise<Result<void, CoreError>> {
    return ok(undefined)
  }

  protected async onComplete(): Promise<Result<void, CoreError>> {
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Critic (Critic-Part01 §Critic Output)
  // -----------------------------------------------------------------------

  /**
   * Produce structured feedback for the Builder.
   * Critic output MUST be structured, not free prose (Critic-Part01 §Critic Output).
   */
  async critique(
    artifactContent: string,
    verificationReport: VerifierOutput,
    taskGoal: string,
    llmExecutor: (prompt: string) => Promise<Result<string, CoreError>>,
  ): Promise<Result<CriticOutput, CoreError>> {
    if (!this.reviewerConfig.enableCritic) {
      return err(new CoreError("validation_error", "Critic is disabled in this reviewer config"))
    }

    const prompt = this.buildCriticPrompt(artifactContent, verificationReport, taskGoal)
    const result = await llmExecutor(prompt)

    if (!result.ok) {
      return err(result.error)
    }

    const criticOutput = this.parseCriticOutput(result.value)
    this.spendBudget(0) // Cost tracked externally
    return ok(criticOutput)
  }

  // -----------------------------------------------------------------------
  // Judge (Judge-Part01 §Verdicts)
  // -----------------------------------------------------------------------

  /**
   * Decide accept / reject / stop.
   * Judge verdict is authoritative for loop termination (Judge-Part01).
   */
  async judge(
    artifactId: ArtifactId,
    verificationReport: VerifierOutput,
    criticFeedback: CriticOutput | undefined,
    taskGoal: string,
    acceptanceCriteria: readonly string[],
    passNumber: number,
    priorCandidates: readonly ArtifactId[],
    llmExecutor: (prompt: string) => Promise<Result<string, CoreError>>,
  ): Promise<Result<JudgeOutput, CoreError>> {
    if (!this.reviewerConfig.enableJudge) {
      return err(new CoreError("validation_error", "Judge is disabled in this reviewer config"))
    }

    const prompt = this.buildJudgePrompt(
      artifactId, verificationReport, criticFeedback,
      taskGoal, acceptanceCriteria, passNumber, priorCandidates,
    )
    const result = await llmExecutor(prompt)

    if (!result.ok) {
      return err(result.error)
    }

    const judgeOutput = this.parseJudgeOutput(result.value)
    this.spendBudget(0)
    return ok(judgeOutput)
  }

  // -----------------------------------------------------------------------
  // Prompt builders
  // -----------------------------------------------------------------------

  private buildCriticPrompt(
    artifactContent: string,
    verificationReport: VerifierOutput,
    taskGoal: string,
  ): string {
    const failedChecks = verificationReport.checks.filter(c => !c.passed)
    return [
      `You are a code critic. Review this artifact and produce structured feedback.`,
      ``,
      `## Goal`,
      taskGoal,
      ``,
      `## Artifact`,
      `\`\`\``,
      artifactContent.slice(0, 4000),
      `\`\`\``,
      ``,
      `## Verification Report`,
      failedChecks.length > 0
        ? `Failed checks:\n${failedChecks.map(c => `- ${c.name}: ${c.details}`).join("\n")}`
        : `All objective checks passed.`,
      ``,
      `## Output Format`,
      `Return JSON with:`,
      `{`,
      `  "issues": [{"description": "...", "severity": "critical|major|minor", "location": "...", "suggestion": "..."}],`,
      `  "strengths": ["..."],`,
      `  "suggestions": ["..."],`,
      `  "questions": ["..."]`,
      `}`,
    ].join("\n")
  }

  private buildJudgePrompt(
    artifactId: ArtifactId,
    verificationReport: VerifierOutput,
    criticFeedback: CriticOutput | undefined,
    taskGoal: string,
    acceptanceCriteria: readonly string[],
    passNumber: number,
    priorCandidates: readonly ArtifactId[],
  ): string {
    const failedChecks = verificationReport.checks.filter(c => !c.passed)
    return [
      `You are a judge. Decide whether this artifact is acceptable.`,
      ``,
      `## Goal`,
      taskGoal,
      ``,
      `## Artifact ID`,
      artifactId,
      ``,
      `## Verification`,
      failedChecks.length > 0
        ? `FAILED: ${failedChecks.map(c => c.name).join(", ")}`
        : `All checks passed.`,
      ``,
      ...(criticFeedback ? [
        `## Critic Feedback`,
        `Issues: ${criticFeedback.issues.length} (${criticFeedback.issues.filter(i => i.severity === "critical").length} critical)`,
        `Strengths: ${criticFeedback.strengths.length}`,
        `Suggestions: ${criticFeedback.suggestions.length}`,
        ``,
      ] : []),
      `## Pass`,
      `${passNumber}`,
      ``,
      `## Prior Candidates`,
      `${priorCandidates.length} prior artifacts evaluated`,
      ``,
      `## Acceptance Criteria`,
      acceptanceCriteria.length > 0 ? acceptanceCriteria.map(c => `- ${c}`).join("\n") : "No specific criteria provided.",
      ``,
      `## Output Format`,
      `Return JSON with:`,
      `{`,
      `  "verdict": "accept|reject|stop",`,
      `  "rationale": "...",`,
      `  "qualityScore": 0.0-1.0`,
      `}`,
    ].join("\n")
  }

  // -----------------------------------------------------------------------
  // Output parsers
  // -----------------------------------------------------------------------

  private parseCriticOutput(raw: string): CriticOutput {
    try {
      const parsed = JSON.parse(raw)
      return {
        issues: (parsed.issues ?? []).map((i: Record<string, string>) => ({
          description: i.description ?? "Unknown issue",
          severity: (["critical", "major", "minor"].includes(i.severity ?? "") ? i.severity : "minor") as "critical" | "major" | "minor",
          location: i.location as string | undefined,
          suggestion: i.suggestion as string | undefined,
        })),
        strengths: parsed.strengths ?? [],
        suggestions: parsed.suggestions ?? [],
        questions: parsed.questions ?? [],
        critiquedAt: new Date().toISOString() as IsoTimestamp,
        tokenUsage: 0,
        costMicroUsd: 0,
      }
    } catch {
      // Fallback: treat raw text as a single issue
      return {
        issues: [{ description: raw.slice(0, 500), severity: "minor" }],
        strengths: [],
        suggestions: [],
        questions: [],
        critiquedAt: new Date().toISOString() as IsoTimestamp,
        tokenUsage: 0,
        costMicroUsd: 0,
      }
    }
  }

  private parseJudgeOutput(raw: string): JudgeOutput {
    try {
      const parsed = JSON.parse(raw)
      const verdict = ["accept", "reject", "stop"].includes(parsed.verdict) ? parsed.verdict : "reject"
      return {
        verdict: verdict as "accept" | "reject" | "stop",
        rationale: parsed.rationale ?? "No rationale provided",
        qualityScore: typeof parsed.qualityScore === "number" ? Math.max(0, Math.min(1, parsed.qualityScore)) : 0.5,
        judgedAt: new Date().toISOString() as IsoTimestamp,
        tokenUsage: 0,
        costMicroUsd: 0,
      }
    } catch {
      return {
        verdict: "reject",
        rationale: "Failed to parse judge output",
        qualityScore: 0,
        judgedAt: new Date().toISOString() as IsoTimestamp,
        tokenUsage: 0,
        costMicroUsd: 0,
      }
    }
  }
}
