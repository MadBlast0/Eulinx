/**
 * P03-EVENT-DLQ — Dead Letter Queue
 *
 * Captures events that failed delivery to subscribers after retries.
 * DLQ entries include the failure reason for debugging.
 *
 * The DLQ does not re-deliver. It records for inspection.
 */

import type { EulinxEventUnion } from "./event-types"
import type { SubscriptionId } from "./event-types"

// ---------------------------------------------------------------------------
// DLQ entry
// ---------------------------------------------------------------------------

export type DeadLetterEntry = {
  readonly event: EulinxEventUnion
  readonly subscriptionId: SubscriptionId
  readonly subscriberKind: "core" | "plugin" | "ui"
  readonly failureReason: string
  readonly failedAt: string
  readonly attemptCount: number
}

// ---------------------------------------------------------------------------
// Dead Letter Queue
// ---------------------------------------------------------------------------

export class DeadLetterQueue {
  private readonly _items: DeadLetterEntry[] = []
  private readonly maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  get length(): number {
    return this._items.length
  }

  /**
   * Add a failed event to the DLQ.
   * Evicts oldest entry if at capacity.
   */
  add(entry: Omit<DeadLetterEntry, "failedAt">): void {
    const fullEntry: DeadLetterEntry = {
      ...entry,
      failedAt: new Date().toISOString(),
    }

    if (this._items.length >= this.maxSize) {
      this._items.shift()
    }
    this._items.push(fullEntry)
  }

  /**
   * Get all DLQ entries, optionally filtered by subscription.
   */
  entries(filter?: { subscriptionId?: SubscriptionId }): DeadLetterEntry[] {
    if (!filter?.subscriptionId) return [...this._items]
    return this._items.filter((e) => e.subscriptionId === filter.subscriptionId)
  }

  /**
   * Get entries for a specific event type.
   */
  entriesByType(eventType: string): DeadLetterEntry[] {
    return this._items.filter((e) => e.event.type === eventType)
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this._items.length = 0
  }

  /**
   * Remove entries for a specific subscription.
   */
  removeBySubscription(subscriptionId: SubscriptionId): number {
    const before = this._items.length
    for (let i = this._items.length - 1; i >= 0; i--) {
      const item = this._items[i]
      if (item && item.subscriptionId === subscriptionId) {
        this._items.splice(i, 1)
      }
    }
    return before - this._items.length
  }
}
