/**
 * P09-MEM-POLICIES / P09-MEM-COMPRESS / P09-MEM-PRUNE — Memory Policies
 *
 * MemoryRules-Part01: non-negotiable rules for memory safety.
 * Handles retention, redaction, scope enforcement, and pruning.
 */

import type { WorkspaceId } from "@/core/types"
import type { MemoryPolicy, SensitivityLevel, MemoryRecord } from "./memory-types"

// ---------------------------------------------------------------------------
// Default Policy
// ---------------------------------------------------------------------------

export const DEFAULT_MEMORY_POLICY: MemoryPolicy = {
  policyId: "default",
  workspaceId: "" as WorkspaceId,
  maxStmPerWorker: 100,
  maxLtmPerWorkspace: 500,
  stmTtlMs: 30 * 60 * 1000, // 30 minutes
  ltmReviewRequired: true,
  autoRedactSecrets: true,
  retentionDays: 90,
  maxTokensPerQuery: 4000,
}

// ---------------------------------------------------------------------------
// Secret Detection (MemoryRules-Part01 §NoRawSecrets)
// ---------------------------------------------------------------------------

const SECRET_PATTERNS: readonly RegExp[] = [
  /(?:api[_-]?key|apikey)\s*[=:]\s*['"]?[A-Za-z0-9\-_]{20,}['"]?/gi,
  /(?:secret|password|passwd|pwd)\s*[=:]\s*['"]?[^\s'"]{8,}['"]?/gi,
  /(?:token|access[_-]?token)\s*[=:]\s*['"]?[A-Za-z0-9\-_\.]{20,}['"]?/gi,
  /(?:private[_-]?key)\s*[=:]\s*['"]?[A-Za-z0-9\-_\/+]{40,}['"]?/gi,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
  /(?:sk|pk)[-_][A-Za-z0-9]{20,}/g,
]

export function containsSecrets(text: string): boolean {
  return SECRET_PATTERNS.some(pattern => pattern.test(text))
}

// ---------------------------------------------------------------------------
// Redaction (MemoryRules-Part01 §MustRedact)
// ---------------------------------------------------------------------------

export function redactSecrets(text: string): string {
  let redacted = text
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (match) => {
      const eqIdx = match.search(/[=:]/)
      if (eqIdx >= 0) {
        const key = match.slice(0, eqIdx + 1)
        return `${key}[REDACTED]`
      }
      return "[REDACTED]"
    })
  }
  return redacted
}

// ---------------------------------------------------------------------------
// Scope Enforcement (MemoryRules-Part01 §MustBeScoped)
// ---------------------------------------------------------------------------

export function isScopeViolation(
  record: MemoryRecord,
  targetWorkspaceId: WorkspaceId,
): boolean {
  return record.workspaceId !== targetWorkspaceId
}

// ---------------------------------------------------------------------------
// Sensitivity Check
// ---------------------------------------------------------------------------

export function isUnsafeForInjection(record: MemoryRecord): boolean {
  return record.sensitivity === "secret"
}

export function needsRedaction(record: MemoryRecord): boolean {
  return record.sensitivity === "secret" || record.sensitivity === "confidential"
}

// ---------------------------------------------------------------------------
// Retention Policy (MemoryRules-Part01 §MustBeDeletable)
// ---------------------------------------------------------------------------

export function isPastRetention(record: MemoryRecord, retentionDays: number): boolean {
  const createdMs = new Date(record.createdAt).getTime()
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000
  return Date.now() - createdMs > retentionMs
}

// ---------------------------------------------------------------------------
// Compression (P09-MEM-COMPRESS)
// ---------------------------------------------------------------------------

/**
 * Compress a list of records into a summary by concatenating and deduplicating.
 * This is a simple compression — in production, LLM-based summarization would be used.
 */
export function compressRecords(records: readonly MemoryRecord[]): string {
  if (records.length === 0) return ""

  const seen = new Set<string>()
  const parts: string[] = []

  for (const record of records) {
    const content = record.summary ?? record.content
    if (!seen.has(content)) {
      seen.add(content)
      parts.push(content)
    }
  }

  return parts.join("\n")
}

// ---------------------------------------------------------------------------
// Pruning (P09-MEM-PRUNE)
// ---------------------------------------------------------------------------

export interface PruneResult {
  readonly prunedCount: number
  readonly retainedCount: number
  readonly prunedIds: readonly string[]
}

export function pruneRecords(
  records: readonly MemoryRecord[],
  policy: MemoryPolicy,
): PruneResult {
  const prunedIds: string[] = []
  const retained: MemoryRecord[] = []

  for (const record of records) {
    if (isPastRetention(record, policy.retentionDays)) {
      prunedIds.push(record.id)
    } else if (record.sensitivity === "secret" && policy.autoRedactSecrets) {
      prunedIds.push(record.id)
    } else {
      retained.push(record)
    }
  }

  return {
    prunedCount: prunedIds.length,
    retainedCount: retained.length,
    prunedIds,
  }
}
