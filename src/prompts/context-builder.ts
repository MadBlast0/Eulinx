/**
 * P12-PROMPT-CTXBUILD — Context Builder
 *
 * Builds context packages for workers and orchestrators.
 * From ContextInjection-Part01 through Part04.
 */

import type {
  ContextPackage,
  ContextCandidate,
} from "./prompt-types"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { Result } from "@/core/result"
import { ok } from "@/core/result"
import type { CoreError } from "@/core/error"

// ---------------------------------------------------------------------------
// Context Builder
// ---------------------------------------------------------------------------

export class ContextBuilder {
  private readonly logger: Logger

  constructor() {
    this.logger = createLogger("ContextBuilder")
  }

  /** Build a context package from candidates */
  build(
    workspaceId: string,
    targetType: ContextPackage["targetType"],
    targetId: string,
    candidates: readonly ContextCandidate[],
    tokenBudget: number,
  ): Result<ContextPackage, CoreError> {
    // Filter by permissions
    const filtered = candidates.filter((c) => c.sensitivity !== "secret")

    // Rank by relevance
    const ranked = [...filtered].sort((a, b) => b.relevance - a.relevance)

    // Select within token budget
    const selected: ContextCandidate[] = []
    let tokensUsed = 0

    for (const candidate of ranked) {
      if (tokensUsed + candidate.tokenCost > tokenBudget) {
        // Try to fit a truncated version
        const remaining = tokenBudget - tokensUsed
        if (remaining > 100) {
          selected.push({
            ...candidate,
            content: candidate.content.substring(0, remaining * 4),
            tokenCost: remaining,
          })
        }
        break
      }
      selected.push(candidate)
      tokensUsed += candidate.tokenCost
    }

    // Build summary
    const summary = this.buildSummary(selected)

    const pkg: ContextPackage = {
      id: `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      workspaceId,
      targetType,
      targetId,
      promptRefs: selected.filter((c) => c.source.startsWith("prompt:")).map((c) => c.source),
      memoryRefs: selected.filter((c) => c.source.startsWith("memory:")).map((c) => c.source),
      artifactRefs: selected.filter((c) => c.source.startsWith("artifact:")).map((c) => c.source),
      fileRefs: selected.filter((c) => c.source.startsWith("file:")).map((c) => c.source),
      summary,
      tokenEstimate: tokensUsed,
      createdAt: new Date().toISOString() as import("@/core/types").IsoTimestamp,
    }

    this.logger.info(`Context built: ${selected.length} candidates, ${tokensUsed} tokens`)
    return ok(pkg)
  }

  /** Build a summary of selected candidates */
  private buildSummary(candidates: readonly ContextCandidate[]): string {
    if (candidates.length === 0) {
      return "No context available"
    }

    const sources = [...new Set(candidates.map((c) => c.source.split(":")[0]))]
    return `Context from ${sources.join(", ")} (${candidates.length} items)`
  }

  /** Estimate token count for text */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4)
  }

  /** Compress text to fit token budget */
  compress(text: string, targetTokens: number): string {
    const currentTokens = this.estimateTokens(text)
    if (currentTokens <= targetTokens) {
      return text
    }

    // Simple truncation with ellipsis
    const maxChars = targetTokens * 4
    return text.substring(0, maxChars - 3) + "..."
  }
}
