/**
 * P15-ORCH-DEBUGGER — Debugger Orchestrator
 *
 * Diagnoses failures, traces root causes, and produces fixes.
 * From AIArchitecture-Part02 §Worker Roles.
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
// Debugger Orchestrator
// ---------------------------------------------------------------------------

export class DebuggerOrchestrator extends BaseOrchestrator {
  private readonly taskNode: PlanNode
  private readonly plan: Plan
  private diagnoses: Diagnosis[] = []

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
    return `Debugger: diagnosing "${this.taskNode.intent.slice(0, 50)}"`
  }

  getDiagnoses(): readonly Diagnosis[] {
    return [...this.diagnoses]
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
  // Diagnosis
  // -----------------------------------------------------------------------

  async diagnose(
    symptoms: string,
    logs: string,
    context: string,
    llmExecutor: (prompt: string) => Promise<Result<string, CoreError>>,
  ): Promise<Result<DiagnosisReport, CoreError>> {
    const prompt = [
      `You are a debugger. Analyze the following symptoms and logs to diagnose the root cause.`,
      ``,
      `## Task`,
      this.taskNode.intent,
      ``,
      `## Symptoms`,
      symptoms,
      ``,
      `## Logs`,
      logs.slice(0, 4000),
      ``,
      `## Context`,
      context.slice(0, 2000),
      ``,
      `## Output Format`,
      `Return JSON with:`,
      `{`,
      `  "rootCause": "...",`,
      `  "evidence": ["..."],`,
      `  "fix": {"description": "...", "files": ["..."], "approach": "..."},`,
      `  "confidence": 0.0-1.0`,
      `}`,
    ].join("\n")

    const result = await llmExecutor(prompt)
    if (!result.ok) return err(result.error)

    try {
      const parsed = JSON.parse(result.value)
      const diagnosis: Diagnosis = {
        rootCause: parsed.rootCause ?? "Unknown",
        evidence: parsed.evidence ?? [],
        fix: {
          description: parsed.fix?.description ?? "",
          files: parsed.fix?.files ?? [],
          approach: parsed.fix?.approach ?? "",
        },
        confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
      }
      this.diagnoses.push(diagnosis)

      return ok({
        diagnosis,
        recommendations: [
          `Apply fix: ${diagnosis.fix.description}`,
          `Files affected: ${diagnosis.fix.files.join(", ")}`,
        ],
      })
    } catch {
      return err(new CoreError("internal_error", "Failed to parse diagnosis output"))
    }
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Diagnosis {
  readonly rootCause: string
  readonly evidence: readonly string[]
  readonly fix: {
    readonly description: string
    readonly files: readonly string[]
    readonly approach: string
  }
  readonly confidence: number
}

export interface DiagnosisReport {
  readonly diagnosis: Diagnosis
  readonly recommendations: readonly string[]
}
