/**
 * P15-ORCH-DOCS — Documentation Orchestrator
 *
 * Produces documentation artifacts: API docs, README, architecture docs, guides.
 * From AIArchitecture-Part02 §Worker Roles.
 */

import type { Result } from "@/core/result"
import { ok } from "@/core/result"
import { CoreError } from "@/core/error"
import type { ArtifactId, IsoTimestamp } from "@/core/types"

import { BaseOrchestrator } from "../orchestrator-base"
import type {
  OrchestratorConfig,
  PlanNode,
  Plan,
} from "../orchestrator-types"

// ---------------------------------------------------------------------------
// Documentation Orchestrator
// ---------------------------------------------------------------------------

export class DocumentationOrchestrator extends BaseOrchestrator {
  private readonly taskNode: PlanNode
  private readonly plan: Plan
  private docArtifacts: DocArtifact[] = []

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
    return `Documentation: writing docs for "${this.taskNode.intent.slice(0, 50)}"`
  }

  getDocArtifacts(): readonly DocArtifact[] {
    return [...this.docArtifacts]
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
  // Documentation generation
  // -----------------------------------------------------------------------

  async generateDoc(
    docType: DocType,
    sourceContent: string,
    context: string,
    llmExecutor: (prompt: string) => Promise<Result<string, CoreError>>,
  ): Promise<Result<DocArtifact, CoreError>> {
    const prompt = [
      `You are a technical writer. Generate ${docType} documentation.`,
      ``,
      `## Task`,
      this.taskNode.intent,
      ``,
      `## Source Content`,
      sourceContent.slice(0, 4000),
      ``,
      `## Context`,
      context.slice(0, 2000),
      ``,
      `## Output Format`,
      `Return JSON with:`,
      `{`,
      `  "title": "...",`,
      `  "content": "...",`,
      `  "sections": ["..."]`,
      `}`,
    ].join("\n")

    const result = await llmExecutor(prompt)
    if (!result.ok) return err(result.error)

    try {
      const parsed = JSON.parse(result.value)
      const artifact: DocArtifact = {
        id: brand(`doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
        type: docType,
        title: parsed.title ?? "Untitled",
        content: parsed.content ?? "",
        sections: parsed.sections ?? [],
        producedAt: new Date().toISOString() as IsoTimestamp,
      }
      this.docArtifacts.push(artifact)
      return ok(artifact)
    } catch {
      return err(new CoreError("internal_error", "Failed to parse documentation output"))
    }
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DocType = "readme" | "api" | "architecture" | "guide" | "changelog" | "adr"

export interface DocArtifact {
  readonly id: ArtifactId
  readonly type: DocType
  readonly title: string
  readonly content: string
  readonly sections: readonly string[]
  readonly producedAt: IsoTimestamp
}
