/**
 * P05-SCH-FAIR — Fair Scheduling (Round-Robin + Starvation Prevention)
 *
 * Implements fair scheduling policies:
 * - Priority aging: low-priority units gain weight over time
 * - Round-robin between execution groups
 * - Per-orchestrator and per-workspace concurrency caps (Scheduler-Part04 §Fairness)
 */

import type { SchedulingUnit, SchedulingPriority } from "./scheduler-types"
import { PRIORITY_NUMERIC } from "./scheduler-types"

// ---------------------------------------------------------------------------
// Fairness Configuration
// ---------------------------------------------------------------------------

export interface FairnessConfig {
  /** Maximum active units per execution group (orchestrator/workflow). */
  readonly maxPerGroup: number
  /** Maximum active units per workspace. */
  readonly maxPerWorkspace: number
  /** Milliseconds before a unit gains one priority level of aging. */
  readonly agingIntervalMs: number
  /** Maximum number of aging levels a unit can gain. */
  readonly maxAgingLevels: number
}

export const DEFAULT_FAIRNESS_CONFIG: FairnessConfig = {
  maxPerGroup: 4,
  maxPerWorkspace: 8,
  agingIntervalMs: 30_000,
  maxAgingLevels: 3,
}

// ---------------------------------------------------------------------------
// Aging
// ---------------------------------------------------------------------------

const AGED_PRIORITIES: SchedulingPriority[] = [
  "critical",
  "high",
  "normal",
  "low",
  "background",
]

/**
 * Compute the effective priority after aging.
 *
 * A unit that has waited longer than `agingIntervalMs` per level gains one
 * priority level. Capped at `maxAgingLevels` improvements and never above
 * "critical".
 */
export function computeAgedPriority(
  priority: SchedulingPriority,
  waitMs: number,
  config: FairnessConfig = DEFAULT_FAIRNESS_CONFIG,
): SchedulingPriority {
  const levelsGained = Math.min(
    Math.floor(waitMs / config.agingIntervalMs),
    config.maxAgingLevels,
  )
  const currentIdx = AGED_PRIORITIES.indexOf(priority)
  const newIdx = Math.max(0, currentIdx - levelsGained)
  return AGED_PRIORITIES[newIdx] ?? priority
}

/**
 * Compute the effective numeric score for a unit accounting for aging.
 * Lower is better. Used for ordering in the runnable queue.
 */
export function computeFairnessScore(
  unit: SchedulingUnit,
  now: number,
  config: FairnessConfig = DEFAULT_FAIRNESS_CONFIG,
): number {
  const waitMs = now - new Date(unit.createdAt).getTime()
  const agedPriority = computeAgedPriority(unit.priority, waitMs, config)
  return PRIORITY_NUMERIC[agedPriority]
}

// ---------------------------------------------------------------------------
// Round-Robin
// ---------------------------------------------------------------------------

/**
 * Round-robin distributor across groups.
 *
 * Maintains a pointer that advances through groups, ensuring each group
 * gets equal scheduling opportunities.
 */
export class RoundRobinDistributor<T extends string> {
  private readonly groups = new Map<T, number>()
  private pointer = 0
  private readonly groupOrder: T[] = []

  register(group: T): void {
    if (!this.groups.has(group)) {
      this.groups.set(group, 0)
      this.groupOrder.push(group)
    }
  }

  unregister(group: T): void {
    this.groups.delete(group)
    const idx = this.groupOrder.indexOf(group)
    if (idx >= 0) this.groupOrder.splice(idx, 1)
    if (this.pointer >= this.groupOrder.length) {
      this.pointer = 0
    }
  }

  next(): T | undefined {
    if (this.groupOrder.length === 0) return undefined
    const group = this.groupOrder[this.pointer % this.groupOrder.length]
    this.pointer = (this.pointer + 1) % this.groupOrder.length
    return group
  }

  getActiveGroups(): readonly T[] {
    return [...this.groupOrder]
  }

  getCount(group: T): number {
    return this.groups.get(group) ?? 0
  }

  increment(group: T): void {
    this.groups.set(group, (this.groups.get(group) ?? 0) + 1)
  }

  decrement(group: T): void {
    const current = this.groups.get(group) ?? 0
    this.groups.set(group, Math.max(0, current - 1))
  }
}

// ---------------------------------------------------------------------------
// Concurrency Caps
// ---------------------------------------------------------------------------

/**
 * Tracks per-group and per-workspace concurrency to enforce fairness caps.
 */
export class ConcurrencyTracker {
  private readonly groupCounts = new Map<string, number>()
  private readonly workspaceCounts = new Map<string, number>()

  canSchedule(
    group: string | undefined,
    workspaceId: string,
    config: Pick<FairnessConfig, "maxPerGroup" | "maxPerWorkspace">,
  ): boolean {
    if (group) {
      const groupCount = this.groupCounts.get(group) ?? 0
      if (groupCount >= config.maxPerGroup) return false
    }
    const wsCount = this.workspaceCounts.get(workspaceId) ?? 0
    if (wsCount >= config.maxPerWorkspace) return false
    return true
  }

  acquire(group: string | undefined, workspaceId: string): void {
    if (group) {
      this.groupCounts.set(group, (this.groupCounts.get(group) ?? 0) + 1)
    }
    this.workspaceCounts.set(workspaceId, (this.workspaceCounts.get(workspaceId) ?? 0) + 1)
  }

  release(group: string | undefined, workspaceId: string): void {
    if (group) {
      const count = this.groupCounts.get(group) ?? 0
      this.groupCounts.set(group, Math.max(0, count - 1))
    }
    const wsCount = this.workspaceCounts.get(workspaceId) ?? 0
    this.workspaceCounts.set(workspaceId, Math.max(0, wsCount - 1))
  }

  getGroupCount(group: string): number {
    return this.groupCounts.get(group) ?? 0
  }

  getWorkspaceCount(workspaceId: string): number {
    return this.workspaceCounts.get(workspaceId) ?? 0
  }

  reset(): void {
    this.groupCounts.clear()
    this.workspaceCounts.clear()
  }
}
