/**
 * P03-EVENT-REPLAY — Event Replay
 *
 * From EventBus-Part05 §Replay and HistoryTables-Part01.
 *
 * Replay reconstructs runtime history from the log.
 * It is read-only by design — no publish method, no service handles.
 *
 * Replay safety rules (absolute):
 *   - Replay MUST NOT publish to the live bus
 *   - Replay MUST NOT spawn Workers
 *   - Replay MUST NOT invoke Tools
 *   - Replay MUST NOT acquire locks
 *   - Replay MUST NOT apply merges
 *   - Replay MUST NOT write to the event log
 *   - Replay MUST NOT mutate any Project file
 */

import type { EulinxEventUnion } from "./event-types"
import type { WorkspaceId, ExecutionId } from "@/core/types"

// ---------------------------------------------------------------------------
// Replay request (EventBus-Part05 §Replay)
// ---------------------------------------------------------------------------

export type ReplayRequest = {
  readonly workspaceId: WorkspaceId
  readonly fromSequence?: number
  readonly toSequence?: number
  readonly executionId?: ExecutionId
  readonly correlationId?: string
}

// ---------------------------------------------------------------------------
// Replay handle
// ---------------------------------------------------------------------------

export type ReplayState =
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "completed"
  | "failed"

export type ReplayHandle = {
  readonly replayId: string
  readonly totalEvents: number
  currentSequence: number
  state: ReplayState
  readonly isPartial: boolean
  readonly gapRanges: ReadonlyArray<{
    readonly fromSequence: number
    readonly toSequence: number
  }>
}

// ---------------------------------------------------------------------------
// Replay subscription
// ---------------------------------------------------------------------------

export type ReplayEventHandler = (event: EulinxEventUnion) => void

export type ReplaySubscription = {
  readonly subscriptionId: string
  readonly handler: ReplayEventHandler
  readonly filter: {
    readonly topics: string[]
  }
}

// ---------------------------------------------------------------------------
// ReplayBus — NO publish method, NO service handles
// ---------------------------------------------------------------------------

/**
 * ReplayBus is the structural enforcement of replay safety.
 * It has no publish method, no log handle, no service handles.
 * A replay subscriber that cannot reach the ExecutionEngine
 * cannot accidentally re-execute anything.
 */
export class ReplayBus {
  private readonly events: EulinxEventUnion[] = []
  private cursor = 0
  private readonly subscribers: ReplaySubscription[] = []
  private handle: ReplayHandle | null = null

  /**
   * Load events for replay in sequence order.
   * Verifies no sequence gaps. A gap means the log was pruned or corrupted.
   */
  load(
    events: EulinxEventUnion[],
    replayId: string,
  ): { ok: true; handle: ReplayHandle } | { ok: false; error: string } {
    if (events.length === 0) {
      return { ok: false, error: "No events to replay" }
    }

    // Sort by sequence ascending
    const sorted = [...events].sort((a, b) => a.sequence - b.sequence)

    // Detect gaps
    const gaps: { fromSequence: number; toSequence: number }[] = []
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      if (prev && curr && curr.sequence !== prev.sequence + 1) {
        gaps.push({ fromSequence: prev.sequence + 1, toSequence: curr.sequence - 1 })
      }
    }

    this.events.length = 0
    this.events.push(...sorted)
    this.cursor = 0

    const firstEvent = sorted[0]
    if (!firstEvent) return { ok: false, error: "No events to replay" }

    this.handle = {
      replayId,
      totalEvents: sorted.length,
      currentSequence: firstEvent.sequence,
      state: "ready",
      isPartial: gaps.length > 0,
      gapRanges: gaps,
    }

    return { ok: true, handle: this.handle }
  }

  /**
   * Subscribe to replay events.
   */
  subscribe(subscription: ReplaySubscription): void {
    this.subscribers.push(subscription)
  }

  /**
   * Unsubscribe from replay events.
   */
  unsubscribe(subscriptionId: string): void {
    const idx = this.subscribers.findIndex((s) => s.subscriptionId === subscriptionId)
    if (idx !== -1) this.subscribers.splice(idx, 1)
  }

  /**
   * Play events from current cursor position.
   * Delivery is globally ordered and synchronous (EventBus-Part05 §Replay Determinism).
   */
  play(): void {
    if (!this.handle) return
    this.handle.state = "playing"

    while (this.cursor < this.events.length) {
      const event = this.events[this.cursor]
      if (!event) break

      // Deliver to matching subscribers (globally ordered, synchronous)
      for (const sub of this.subscribers) {
        if (sub.filter.topics.length === 0) continue
        const matches = sub.filter.topics.some(
          (t) => t === "*" || t === event.type || event.type.startsWith(t.replace("*", "")),
        )
        if (matches) {
          sub.handler(event)
        }
      }

      this.handle.currentSequence = event.sequence
      this.cursor++
    }

    this.handle.state = "completed"
  }

  /**
   * Pause replay.
   */
  pause(): void {
    if (this.handle?.state === "playing") {
      this.handle.state = "paused"
    }
  }

  /**
   * Resume replay from current position.
   */
  resume(): void {
    if (this.handle?.state === "paused") {
      this.play()
    }
  }

  /**
   * Get the current replay handle.
   */
  getHandle(): ReplayHandle | null {
    return this.handle
  }

  /**
   * Get all loaded events in sequence order.
   */
  getEvents(): readonly EulinxEventUnion[] {
    return this.events
  }

  /**
   * Reset replay state.
   */
  reset(): void {
    this.events.length = 0
    this.cursor = 0
    this.subscribers.length = 0
    this.handle = null
  }
}
