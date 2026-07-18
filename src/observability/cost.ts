/**
 * P19-OBS-COST — Cost Tracking
 *
 * Track token usage and monetary cost across every AI call.
 * From CostOptimization-Part01 through Part05.
 */

import type { CostEntry, CostPeriod, CostSummary } from "./observability-types"
import type { WorkspaceId } from "@/core/types"

// Mutable versions for aggregation
interface MutableProviderSummary {
  provider: string
  costUsd: number
  tokens: number
  calls: number
}

interface MutableModelSummary {
  model: string
  provider: string
  costUsd: number
  tokens: number
  calls: number
  avgLatencyMs: number
}

// ---------------------------------------------------------------------------
// Cost Tracker
// ---------------------------------------------------------------------------

export class CostTracker {
  private readonly entries: CostEntry[] = []
  private readonly maxEntries = 50_000

  /**
   * Record a cost entry.
   */
  record(entry: Omit<CostEntry, "entryId" | "timestamp">): CostEntry {
    const full: CostEntry = {
      ...entry,
      entryId: `cost_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString() as any,
    }
    this.entries.push(full)
    if (this.entries.length > this.maxEntries) {
      this.entries.shift()
    }
    return full
  }

  /**
   * Get cost summary for a period.
   */
  getSummary(period: CostPeriod = "all", workspaceId?: WorkspaceId): CostSummary {
    const filtered = this.filterByPeriod(period)
    const wsFiltered = workspaceId ? filtered.filter((e) => e.workspaceId === workspaceId) : filtered

    const totalCostUsd = wsFiltered.reduce((sum, e) => sum + e.costUsd, 0)
    const totalTokens = wsFiltered.reduce((sum, e) => sum + e.inputTokens + e.outputTokens, 0)

    const byProvider: Record<string, MutableProviderSummary> = {}
    const byModel: Record<string, MutableModelSummary> = {}
    const byWorkspace: Record<string, number> = {}

    for (const entry of wsFiltered) {
      // By provider
      if (!byProvider[entry.provider]) {
        byProvider[entry.provider] = { provider: entry.provider, costUsd: 0, tokens: 0, calls: 0 }
      }
      const pSum = byProvider[entry.provider]!
      pSum.costUsd += entry.costUsd
      pSum.tokens += entry.inputTokens + entry.outputTokens
      pSum.calls++

      // By model
      const modelKey = `${entry.provider}/${entry.model}`
      if (!byModel[modelKey]) {
        byModel[modelKey] = {
          model: entry.model,
          provider: entry.provider,
          costUsd: 0,
          tokens: 0,
          calls: 0,
          avgLatencyMs: 0,
        }
      }
      const mSum = byModel[modelKey]!
      mSum.costUsd += entry.costUsd
      mSum.tokens += entry.inputTokens + entry.outputTokens
      mSum.calls++
      mSum.avgLatencyMs = (mSum.avgLatencyMs * (mSum.calls - 1) + entry.latencyMs) / mSum.calls

      // By workspace
      byWorkspace[entry.workspaceId] = (byWorkspace[entry.workspaceId] ?? 0) + entry.costUsd
    }

    return { totalCostUsd, totalTokens, byProvider, byModel, byWorkspace, period }
  }

  /**
   * Get entries for a period.
   */
  getEntries(period: CostPeriod = "all", workspaceId?: WorkspaceId): CostEntry[] {
    const filtered = this.filterByPeriod(period)
    return workspaceId ? filtered.filter((e) => e.workspaceId === workspaceId) : filtered
  }

  /**
   * Get total cost.
   */
  getTotalCost(): number {
    return this.entries.reduce((sum, e) => sum + e.costUsd, 0)
  }

  /**
   * Get total tokens.
   */
  getTotalTokens(): number {
    return this.entries.reduce((sum, e) => sum + e.inputTokens + e.outputTokens, 0)
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.entries.length = 0
  }

  private filterByPeriod(period: CostPeriod): CostEntry[] {
    if (period === "all") return this.entries
    const now = Date.now()
    const ms: Record<string, number> = {
      hour: 3_600_000,
      day: 86_400_000,
      week: 604_800_000,
      month: 2_592_000_000,
    }
    const cutoff = new Date(now - (ms[period] ?? 0)).toISOString()
    return this.entries.filter((e) => e.timestamp >= cutoff)
  }
}
