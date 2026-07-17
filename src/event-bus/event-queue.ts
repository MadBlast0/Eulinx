/**
 * P03-EVENT-QUEUE — Event Queue (Async Buffering)
 *
 * Three queue paths from EventBus-Part03 and Part-04:
 *   - Core queue: bounded, uses push (may block via backpressure)
 *   - Plugin queue: bounded, uses tryPush (never blocks, drops oldest)
 *   - UI queue: bounded, uses tryPush (never blocks, coalesces on full)
 *
 * Core and plugin subscribers receive events through different queues
 * to enforce the untrusted subscriber rule.
 */

import type { EulinxEventUnion } from "./event-types"

// ---------------------------------------------------------------------------
// Queue types
// ---------------------------------------------------------------------------

export type QueueKind = "core" | "plugin" | "ui"

export type QueueEntry = {
  readonly event: EulinxEventUnion
  readonly enqueuedAt: number
}

export type QueueStats = {
  readonly depth: number
  readonly capacity: number
  readonly totalEnqueued: number
  readonly totalDropped: number
}

// ---------------------------------------------------------------------------
// Event Queue
// ---------------------------------------------------------------------------

/**
 * Bounded FIFO queue for event delivery.
 *
 * Core queue: full → wait with timeout (backpressure).
 * Plugin queue: full → drop oldest, never wait.
 * UI queue: full → drop oldest, never wait.
 */
export class EventQueue {
  private readonly entries: QueueEntry[] = []
  private readonly capacity: number
  private readonly kind: QueueKind
  private totalEnqueued = 0
  private totalDropped = 0

  constructor(kind: QueueKind, capacity: number) {
    this.kind = kind
    this.capacity = capacity
  }

  get length(): number {
    return this.entries.length
  }

  get isFull(): boolean {
    return this.entries.length >= this.capacity
  }

  get stats(): QueueStats {
    return {
      depth: this.entries.length,
      capacity: this.capacity,
      totalEnqueued: this.totalEnqueued,
      totalDropped: this.totalDropped,
    }
  }

  /**
   * Enqueue an event. For plugin/UI queues, drops oldest on full.
   * Returns the dropped event if one was evicted.
   */
  push(event: EulinxEventUnion): EulinxEventUnion | undefined {
    let dropped: EulinxEventUnion | undefined

    if (this.isFull && this.kind !== "core") {
      // Plugin/UI: drop oldest, never block
      dropped = this.entries.shift()?.event
      if (dropped) this.totalDropped++
    }

    this.entries.push({ event, enqueuedAt: Date.now() })
    this.totalEnqueued++
    return dropped
  }

  /**
   * Try to enqueue without blocking. Returns false if full (and not core).
   * For core queue, always enqueues (caller should await space).
   */
  tryPush(event: EulinxEventUnion): { success: boolean; dropped?: EulinxEventUnion } {
    if (this.isFull && this.kind !== "core") {
      const dropped = this.entries.shift()?.event
      if (dropped) this.totalDropped++
      this.entries.push({ event, enqueuedAt: Date.now() })
      this.totalEnqueued++
      return { success: true, dropped }
    }

    if (this.isFull && this.kind === "core") {
      return { success: false }
    }

    this.entries.push({ event, enqueuedAt: Date.now() })
    this.totalEnqueued++
    return { success: true }
  }

  /**
   * Dequeue the next event. Returns undefined if empty.
   */
  pop(): QueueEntry | undefined {
    return this.entries.shift()
  }

  /**
   * Peek at the next event without removing.
   */
  peek(): QueueEntry | undefined {
    return this.entries[0]
  }

  /**
   * Remove all entries. Returns them for cleanup.
   */
  drain(): QueueEntry[] {
    return this.entries.splice(0, this.entries.length)
  }

  /**
   * Get queue age (ms since oldest entry).
   */
  oldestAgeMs(): number | undefined {
    const first = this.entries[0]
    if (!first) return undefined
    return Date.now() - first.enqueuedAt
  }
}
