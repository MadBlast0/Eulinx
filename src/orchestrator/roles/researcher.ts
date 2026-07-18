/**
 * P15-ORCH-RESEARCHER — Researcher Orchestrator
 *
 * Investigates, gathers information, and produces research artifacts.
 * From AIArchitecture-Part02 §Worker Roles, RefinementLoop-Part01.
 */

import type { Result } from "@/core/result"
import { ok } from "@/core/result"
import { CoreError } from "@/core/error"
import type { IsoTimestamp } from "@/core/types"

import { BaseOrchestrator } from "../orchestrator-base"
import type {
  OrchestratorConfig,
  PlanNode,
  Plan,
} from "../orchestrator-types"

// ---------------------------------------------------------------------------
// Researcher Orchestrator
// ---------------------------------------------------------------------------

export class ResearcherOrchestrator extends BaseOrchestrator {
  private readonly taskNode: PlanNode
  private readonly plan: Plan
  private findings: ResearchFinding[] = []

  constructor(
    config: OrchestratorConfig,
    taskNode: PlanNode,
    plan: Plan,
  ) {
    super(config)
    this.taskNode = taskNode
    this.plan = plan
  }

  // -----------------------------------------------------------------------
  // Identity
  // -----------------------------------------------------------------------

  describe(): string {
    return `Researcher: investigating "${this.taskNode.intent.slice(0, 50)}"`
  }

  getFindings(): readonly ResearchFinding[] {
    return [...this.findings]
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
  // Research
  // -----------------------------------------------------------------------

  async research(
    context: string,
    sources: readonly string[],
    llmExecutor: (prompt: string) => Promise<Result<string, CoreError>>,
  ): Promise<Result<ResearchReport, CoreError>> {
    const prompt = [
      `You are a researcher. Investigate the following and produce a structured report.`,
      ``,
      `## Topic`,
      this.taskNode.intent,
      ``,
      `## Context`,
      context.slice(0, 3000),
      ``,
      ...(sources.length > 0 ? [
        `## Sources`,
        sources.map(s => `- ${s}`).join("\n"),
        ``,
      ] : []),
      `## Output Format`,
      `Return JSON with:`,
      `{`,
      `  "summary": "...",`,
      `  "findings": [{"topic": "...", "evidence": "...", "confidence": 0.0-1.0}],`,
      `  "recommendations": ["..."],`,
      `  "openQuestions": ["..."]`,
      `}`,
    ].join("\n")

    const result = await llmExecutor(prompt)
    if (!result.ok) return err(result.error)

    try {
      const parsed = JSON.parse(result.value)
      const findings: ResearchFinding[] = (parsed.findings ?? []).map((f: Record<string, string | number>) => ({
        topic: (f.topic as string) ?? "Unknown",
        evidence: (f.evidence as string) ?? "",
        confidence: typeof f.confidence === "number" ? Math.max(0, Math.min(1, f.confidence)) : 0.5,
      }))
      this.findings.push(...findings)

      return ok({
        summary: parsed.summary ?? "",
        findings,
        recommendations: parsed.recommendations ?? [],
        openQuestions: parsed.openQuestions ?? [],
      })
    } catch {
      return err(new CoreError("internal_error", "Failed to parse research output"))
    }
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResearchFinding {
  readonly topic: string
  readonly evidence: string
  readonly confidence: number
}

export interface ResearchReport {
  readonly summary: string
  readonly findings: readonly ResearchFinding[]
  readonly recommendations: readonly string[]
  readonly openQuestions: readonly string[]
}
