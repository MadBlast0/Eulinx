/**
 * P15-ORCH-ARCHITECT — Architect Orchestrator
 *
 * System design and architecture decisions. Produces architecture plans,
 * ADRs, and structural designs. From AIArchitecture-Part02 §Worker Roles.
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
  ArchitectConfig,
} from "../orchestrator-types"

// ---------------------------------------------------------------------------
// Architect Orchestrator
// ---------------------------------------------------------------------------

export class ArchitectOrchestrator extends BaseOrchestrator {
  private readonly architectConfig: ArchitectConfig
  private readonly taskNode: PlanNode
  private readonly plan: Plan
  private architectureDecisions: ArchitectureDecision[] = []

  constructor(
    config: OrchestratorConfig,
    taskNode: PlanNode,
    plan: Plan,
    architectConfig?: Partial<ArchitectConfig>,
  ) {
    super(config)
    this.taskNode = taskNode
    this.plan = plan
    this.architectConfig = {
      enforceStyleGuide: true,
      requireADRs: true,
      architecturalDecisionLog: true,
      ...architectConfig,
    }
  }

  // -----------------------------------------------------------------------
  // Identity
  // -----------------------------------------------------------------------

  describe(): string {
    return `Architect: designing system for "${this.taskNode.intent.slice(0, 50)}"`
  }

  getDecisions(): readonly ArchitectureDecision[] {
    return [...this.architectureDecisions]
  }

  // -----------------------------------------------------------------------
  // Lifecycle hooks
  // -----------------------------------------------------------------------

  protected async onPlan(): Promise<Result<void, CoreError>> {
    this.logger.info(`Architect planning: ${this.taskNode.intent}`)
    return ok(undefined)
  }

  protected async onDelegate(): Promise<Result<void, CoreError>> {
    return ok(undefined)
  }

  protected async onComplete(): Promise<Result<void, CoreError>> {
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Architecture decision recording
  // -----------------------------------------------------------------------

  recordDecision(decision: Omit<ArchitectureDecision, "id" | "recordedAt">): ArchitectureDecision {
    const record: ArchitectureDecision = {
      id: `adr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...decision,
      recordedAt: new Date().toISOString() as IsoTimestamp,
    }
    this.architectureDecisions.push(record)
    return record
  }

  // -----------------------------------------------------------------------
  // Design output
  // -----------------------------------------------------------------------

  async design(
    context: string,
    llmExecutor: (prompt: string) => Promise<Result<string, CoreError>>,
  ): Promise<Result<ArchitectureDesign, CoreError>> {
    const prompt = [
      `You are a software architect. Design the system architecture for:`,
      this.taskNode.intent,
      ``,
      `## Context`,
      context.slice(0, 3000),
      ``,
      `## Output Format`,
      `Return JSON with:`,
      `{`,
      `  "components": [{"name": "...", "responsibility": "...", "dependencies": ["..."]}],`,
      `  "interfaces": [{"from": "...", "to": "...", "protocol": "..."}],`,
      `  "decisions": [{"topic": "...", "decision": "...", "rationale": "...", "alternatives": ["..."]}],`,
      `  "risks": ["..."]`,
      `}`,
    ].join("\n")

    const result = await llmExecutor(prompt)
    if (!result.ok) return err(result.error)

    try {
      const parsed = JSON.parse(result.value)
      const design: ArchitectureDesign = {
        components: parsed.components ?? [],
        interfaces: parsed.interfaces ?? [],
        decisions: (parsed.decisions ?? []).map((d: Record<string, string>) =>
          this.recordDecision({
            topic: d.topic ?? "Unknown",
            decision: d.decision ?? "",
            rationale: d.rationale ?? "",
            alternatives: (d.alternatives ?? []) as string[],
          }),
        ),
        risks: (parsed.risks ?? []) as string[],
      }
      return ok(design)
    } catch {
      return err(new CoreError("internal_error", "Failed to parse architecture design output"))
    }
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArchitectureDecision {
  readonly id: string
  readonly topic: string
  readonly decision: string
  readonly rationale: string
  readonly alternatives: readonly string[]
  readonly recordedAt: IsoTimestamp
}

export interface ArchitectureDesign {
  readonly components: readonly ComponentDesign[]
  readonly interfaces: readonly InterfaceDesign[]
  readonly decisions: readonly ArchitectureDecision[]
  readonly risks: readonly string[]
}

export interface ComponentDesign {
  readonly name: string
  readonly responsibility: string
  readonly dependencies: readonly string[]
}

export interface InterfaceDesign {
  readonly from: string
  readonly to: string
  readonly protocol: string
}
