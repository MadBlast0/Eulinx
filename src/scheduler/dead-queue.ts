/**
 * P05-SCH-DEAD — Dead Queue
 *
 * Stores permanently failed scheduling units that cannot be retried.
 * Provides diagnostic information for debugging and replay
 * (Scheduler-Part06 §Failure Propagation).
 */

import type { FailureCategory } from "./scheduler-types"
import { SCHEDULER } from "@/core/constants"

// ---------------------------------------------------------------------------
// Dead Entry
// ---------------------------------------------------------------------------

export interface DeadEntry {
  readonly unitId: string
  readonly kind: string
  readonly priority: string
  readonly lastError: string
  readonly failureCategory: FailureCategory
  readonly attemptCount: number
  readonly enteredAt: string
  readonly createdAt: string
}

// ---------------------------------------------------------------------------
// Dead Queue
// ---------------------------------------------------------------------------

export class DeadQueue {
  private readonly entries = new Map<string, DeadEntry>()

  /**
   * Move a permanently failed unit to the dead queue.
   */
  add(entry: DeadEntry): void {
    // Enforce max size — drop oldest if needed
    if (this.entries.size >= SCHEDULER.DEAD_LETTER_MAX_SIZE) {
      const oldest = this.entries.keys().next().value
      if (oldest !== undefined) {
        this.entries.delete(oldest)
      }
    }
    this.entries.set(entry.unitId, entry)
  }

  /**
   * Get a dead entry by unit ID.
   */
  get(unitId: string): DeadEntry | undefined {
    return this.entries.get(unitId)
  }

  /**
   * Remove a unit from the dead queue (e.g., for investigation).
   */
  remove(unitId: string): DeadEntry | undefined {
    const entry = this.entries.get(unitId)
    this.entries.delete(unitId)
    return entry
  }

  /**
   * Check if a unit is in the dead queue.
   */
  contains(unitId: string): boolean {
    return this.entries.has(unitId)
  }

  /**
   * Get all dead entries, sorted by entry time (oldest first).
   */
  getAll(): readonly DeadEntry[] {
    return [...this.entries.values()].sort(
      (a, b) => new Date(a.enteredAt).getTime() - new Date(b.enteredAt).getTime(),
    )
  }

  /**
   * Get dead entries filtered by failure category.
   */
  getByCategory(category: FailureCategory): readonly DeadEntry[] {
    return this.getAll().filter((e) => e.failureCategory === category)
  }

  get size(): number {
    return this.entries.size
  }

  clear(): void {
    this.entries.clear()
  }
}
