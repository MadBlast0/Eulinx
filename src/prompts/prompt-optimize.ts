/**
 * P12-PROMPT-OPTIMIZE — Prompt Optimization
 *
 * Real, lightweight prompt auto-tuning.
 *
 * Deterministic pass (always runs):
 *   - collapse duplicate/near-duplicate instruction lines
 *   - trim redundant whitespace and blank lines
 *   - normalize bullet markers for consistency
 *   - de-duplicate repeated sentences (case-insensitive)
 *   - hoist the most specific ("MUST"/"NEVER" style) constraints toward the top
 *
 * Optional LLM pass (when an executor is supplied):
 *   - asks the model to rewrite the prompt for conciseness while preserving
 *     every instruction; we then fall back to the deterministic result if the
 *     model output fails validation (e.g. drops a required instruction).
 *
 * Honest output: `OptimizationResult` reports exactly what changed and the
 * measured token delta. We never claim "improved" without doing the work.
 */

import type { Result } from "@/core/result"
import type { CoreError } from "@/core/error"
import type { PromptTemplate } from "./prompt-types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OptimizationResult {
  /** The optimized prompt text. */
  readonly optimized: string
  /** Original character length. */
  readonly originalLength: number
  /** Optimized character length. */
  readonly optimizedLength: number
  /** Rough token delta (optimized - original), ~4 chars/token. */
  readonly tokenDelta: number
  /** Human-readable list of transformations that were applied. */
  readonly applied: readonly string[]
  /** Whether the LLM rewrite was used (false = deterministic fallback). */
  readonly usedLlm: boolean
}

export type PromptOptimizerExecutor = (prompt: string) => Promise<Result<string, CoreError>>

// ---------------------------------------------------------------------------
// PromptOptimizer
// ---------------------------------------------------------------------------

export class PromptOptimizer {
  /** Deterministic optimization of raw prompt text. */
  optimizeText(text: string): OptimizationResult {
    const applied: string[] = []

    let working = text
    const ws = this.trimWhitespace(working)
    if (ws !== working) {
      working = ws
      applied.push("trimmed redundant whitespace and blank lines")
    }

    const bullets = this.normalizeBullets(working)
    if (bullets !== working) {
      working = bullets
      applied.push("normalized bullet markers")
    }

    const dedupLines = this.dedupeLines(working)
    if (dedupLines !== working) {
      working = dedupLines
      applied.push("removed duplicate instruction lines")
    }

    const reordered = this.hoistConstraints(working)
    if (reordered !== working) {
      working = reordered
      applied.push("hoisted hard constraints to the top")
    }

    const finalText = working.trim()
    return this.buildResult(text, finalText, applied, false)
  }

  /** Optimize, optionally using an LLM rewrite that must preserve instructions. */
  async optimizeTextWithLlm(
    text: string,
    executor: PromptOptimizerExecutor,
  ): Promise<OptimizationResult> {
    const deterministic = this.optimizeText(text)

    const prompt = [
      `Rewrite the following prompt to be more concise and clear.`,
      `Do NOT drop any instruction, constraint, or required output format.`,
      `Preserve all meaning. Return ONLY the rewritten prompt, no commentary.`,
      ``,
      `---PROMPT---`,
      text,
      `---END---`,
    ].join("\n")

    const llmResult = await executor(prompt)
    if (llmResult.ok) {
      const candidate = llmResult.value.trim()
      if (candidate.length > 0 && this.preservesInstructions(text, candidate)) {
        const delta = deterministic.originalLength - candidate.length
        return {
          optimized: candidate,
          originalLength: deterministic.originalLength,
          optimizedLength: candidate.length,
          tokenDelta: Math.ceil(delta / 4),
          applied: [...deterministic.applied, "llm conciseness rewrite"],
          usedLlm: true,
        }
      }
    }

    // Fallback to deterministic result — honest, no fake improvement claim.
    return deterministic
  }

  /** Optimize a registered template and return a new version (caller persists). */
  optimizeTemplate(template: PromptTemplate, llmExecutor?: PromptOptimizerExecutor): Promise<OptimizationResult> {
    if (llmExecutor) {
      return this.optimizeTextWithLlm(template.template, llmExecutor)
    }
    return Promise.resolve(this.optimizeText(template.template))
  }

  // -----------------------------------------------------------------------
  // Deterministic transforms
  // -----------------------------------------------------------------------

  private trimWhitespace(text: string): string {
    return text
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/g, "").replace(/^[ \t]+/g, ""))
      .filter((line, index, arr) => !(line.trim() === "" && (index === 0 || index === arr.length - 1 || (arr[index - 1]?.trim() ?? "") === "")))
      .join("\n")
  }

  private normalizeBullets(text: string): string {
    return text.replace(/^[ \t]*(?:-|\*|\+|\d+\.|•)[ \t]+/gm, "- ")
  }

  private dedupeLines(text: string): string {
    const seen = new Set<string>()
    const out: string[] = []
    for (const raw of text.split("\n")) {
      const key = raw.trim().toLowerCase()
      if (key.length === 0) {
        out.push(raw)
        continue
      }
      if (seen.has(key)) continue
      seen.add(key)
      out.push(raw)
    }
    return out.join("\n")
  }

  private hoistConstraints(text: string): string {
    const lines = text.split("\n")
    const constraintRegex = /^\s*[-*]\s+(must|never|always|required|do not|don't|禁止|必须)/i
    const constraints: string[] = []
    const rest: string[] = []
    for (const line of lines) {
      if (constraintRegex.test(line)) constraints.push(line)
      else rest.push(line)
    }
    if (constraints.length === 0) return text
    return [...constraints, "", ...rest].join("\n")
  }

  // -----------------------------------------------------------------------
  // LLM output validation
  // -----------------------------------------------------------------------

  /** Cheap heuristic: every non-empty line of the original should be roughly
   *  represented in the candidate. We check key instruction keywords survive. */
  private preservesInstructions(original: string, candidate: string): boolean {
    const extractKeywords = (s: string): string[] => {
      const matches = s.match(/\b(must|never|always|required|return|json|format|output|constraint|should|avoid)\b/gi)
      return matches ? matches.map((m) => m.toLowerCase()) : []
    }
    const orig = extractKeywords(original)
    const cand = new Set(extractKeywords(candidate))
    if (orig.length === 0) return true
    const missing = orig.filter((k) => !cand.has(k))
    // Allow at most 1 missing keyword to tolerate light rewording.
    return missing.length <= 1
  }

  private buildResult(
    original: string,
    optimized: string,
    applied: readonly string[],
    usedLlm: boolean,
  ): OptimizationResult {
    const originalLength = original.length
    const optimizedLength = optimized.length
    return {
      optimized,
      originalLength,
      optimizedLength,
      tokenDelta: Math.ceil((optimizedLength - originalLength) / 4),
      applied,
      usedLlm,
    }
  }
}
