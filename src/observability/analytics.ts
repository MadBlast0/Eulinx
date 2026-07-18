/**
 * P19-OBS-ANALYTICS — Usage Analytics
 *
 * Track usage events for analytics and insights.
 * From CostOptimization-Part01 through Part05.
 */

import type { UsageEvent, UsageEventKind } from "./observability-types"
import type { WorkspaceId } from "@/core/types"

// ---------------------------------------------------------------------------
// Analytics Tracker
// ---------------------------------------------------------------------------

export class AnalyticsTracker {
  private readonly events: UsageEvent[] = []
  private readonly maxEvents = 10_000

  /**
   * Track a usage event.
   */
  track(kind: UsageEventKind, workspaceId: WorkspaceId, metadata: Record<string, unknown> = {}): UsageEvent {
    const event: UsageEvent = {
      eventId: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      kind,
      timestamp: new Date().toISOString() as any,
      workspaceId,
      metadata,
    }
    this.events.push(event)
    if (this.events.length > this.maxEvents) {
      this.events.shift()
    }
    return event
  }

  /**
   * Get events by kind.
   */
  getByKind(kind: UsageEventKind): UsageEvent[] {
    return this.events.filter((e) => e.kind === kind)
  }

  /**
   * Get events by workspace.
   */
  getByWorkspace(workspaceId: WorkspaceId): UsageEvent[] {
    return this.events.filter((e) => e.workspaceId === workspaceId)
  }

  /**
   * Get events in a time range.
   */
  getInRange(start: string, end: string): UsageEvent[] {
    return this.events.filter((e) => e.timestamp >= start && e.timestamp <= end)
  }

  /**
   * Get event counts by kind.
   */
  getCountsByKind(): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const event of this.events) {
      counts[event.kind] = (counts[event.kind] ?? 0) + 1
    }
    return counts
  }

  /**
   * Get total event count.
   */
  getTotalCount(): number {
    return this.events.length
  }

  /**
   * Clear all events.
   */
  clear(): void {
    this.events.length = 0
  }
}
