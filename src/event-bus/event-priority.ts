/**
 * P03-EVENT-PRIORITY — Event Priority System
 *
 * Priority levels for event ordering within subscriber queues.
 * Higher priority events are delivered first when the queue has pending items.
 *
 * Priority does NOT override per-source ordering — events from the same
 * source are always delivered in publication order (EventBus-Part03 §Ordering).
 * Priority only affects the interleaving between different sources.
 */

import type { EulinxEventUnion } from "./event-types"

// ---------------------------------------------------------------------------
// Priority levels
// ---------------------------------------------------------------------------

export type EventPriority = "critical" | "high" | "normal" | "low"

/**
 * Priority mapping for event families.
 * Critical: invariant violations, log write failures, shutdown events
 * High: state changes, completions, failures
 * Normal: most events
 * Low: progress reports, output streams, metrics
 */
export const EVENT_PRIORITY_MAP: Record<string, EventPriority> = {
  // Critical — always delivered first
  "runtime.invariant_violated": "critical",
  "eventbus.log_write_failed": "critical",
  "runtime.stopped": "critical",

  // High — important state transitions
  "runtime.started": "high",
  "runtime.state_changed": "high",
  "runtime.service_health_changed": "high",
  "worker.spawned": "high",
  "worker.ready": "high",
  "worker.completed": "high",
  "worker.failed": "high",
  "worker.terminated": "high",
  "worker.cancelled": "high",
  "execution.started": "high",
  "execution.completed": "high",
  "execution.failed": "high",
  "execution.cancelled": "high",
  "artifact.created": "high",
  "artifact.verified": "high",
  "artifact.rejected": "high",
  "merge.requested": "high",
  "merge.applied": "high",
  "merge.failed": "high",
  "merge.rolled_back": "high",
  "merge.approved": "high",
  "merge.rejected": "high",
  "lock.granted": "high",
  "lock.denied": "high",
  "lock.deadlock_detected": "high",
  "permission.granted": "high",
  "permission.denied": "high",
  "permission.requested": "high",
  "plugin.quarantined": "high",

  // Normal — standard events
  "worker.state_changed": "normal",
  "execution.node_queued": "normal",
  "execution.node_started": "normal",
  "execution.node_completed": "normal",
  "execution.node_failed": "normal",
  "execution.node_blocked": "normal",
  "lock.requested": "normal",
  "lock.queued": "normal",
  "lock.released": "normal",
  "lock.timed_out": "normal",
  "tool.registered": "normal",
  "tool.invoked": "normal",
  "tool.succeeded": "normal",
  "tool.failed": "normal",
  "tool.timed_out": "normal",
  "tool.blocked": "normal",
  "process.started": "normal",
  "process.exited": "normal",
  "process.killed": "normal",
  "process.crashed": "normal",
  "process.restarted": "normal",
  "plugin.loaded": "normal",
  "plugin.unloaded": "normal",
  "plugin.subscribed": "normal",
  "plugin.errored": "normal",
  "memory.written": "normal",
  "memory.summarized": "normal",
  "memory.indexed": "normal",
  "memory.evicted": "normal",
  "merge.conflict_detected": "normal",
  "merge.approval_required": "normal",
  "permission.prompt_shown": "normal",
  "permission.revoked": "normal",
  "permission.profile_applied": "normal",
  "runtime.workspace_bound": "normal",
  "eventbus.subscriber_dropped_event": "normal",
  "eventbus.subscriber_panicked": "normal",
  "eventbus.backpressure_engaged": "normal",
  "artifact.versioned": "normal",
  "artifact.indexed": "normal",
  "artifact.discarded": "normal",

  // Low — high-frequency, non-critical
  "worker.output_streamed": "low",
  "process.output_streamed": "low",
  "execution.progress_reported": "low",
  "memory.search_performed": "low",
  "ui.view_opened": "low",
  "ui.user_action": "low",
  "ui.notification_raised": "low",
}

// ---------------------------------------------------------------------------
// Priority queue for ordered delivery
// ---------------------------------------------------------------------------

type PrioritizedEntry = {
  readonly event: EulinxEventUnion
  readonly priority: number
  readonly sequence: number
  readonly enqueuedAt: number
}

const PRIORITY_VALUES: Record<EventPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

/**
 * Min-heap priority queue that respects per-source ordering.
 * Lower priority value = higher priority = dequeued first.
 * Within the same priority, lower sequence number = dequeued first.
 */
export class EventPriorityQueue {
  private heap: PrioritizedEntry[] = []

  get length(): number {
    return this.heap.length
  }

  get isEmpty(): boolean {
    return this.heap.length === 0
  }

  enqueue(event: EulinxEventUnion): void {
    const priority = EVENT_PRIORITY_MAP[event.type] ?? "normal"
    const entry: PrioritizedEntry = {
      event,
      priority: PRIORITY_VALUES[priority],
      sequence: event.sequence,
      enqueuedAt: Date.now(),
    }
    this.heap.push(entry)
    this.bubbleUp(this.heap.length - 1)
  }

  dequeue(): EulinxEventUnion | undefined {
    if (this.heap.length === 0) return undefined
    const top = this.heap[0]
    const last = this.heap.pop()
    if (!top || !last) return undefined
    if (this.heap.length > 0) {
      this.heap[0] = last
      this.sinkDown(0)
    }
    return top.event
  }

  peek(): EulinxEventUnion | undefined {
    return this.heap[0]?.event
  }

  drain(): EulinxEventUnion[] {
    const result: EulinxEventUnion[] = []
    while (this.heap.length > 0) {
      const event = this.dequeue()
      if (event) result.push(event)
    }
    return result
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1
      if (this.shouldSwap(parentIdx, idx)) {
        const temp = this.heap[idx]
        const parent = this.heap[parentIdx]
        if (temp && parent) {
          this.heap[idx] = parent
          this.heap[parentIdx] = temp
        }
        idx = parentIdx
      } else {
        break
      }
    }
  }

  private sinkDown(idx: number): void {
    const length = this.heap.length
    while (true) {
      const left = 2 * idx + 1
      const right = 2 * idx + 2
      let smallest = idx

      if (left < length && this.shouldSwap(smallest, left)) smallest = left
      if (right < length && this.shouldSwap(smallest, right)) smallest = right

      if (smallest !== idx) {
        const temp = this.heap[idx]
        const smallestEntry = this.heap[smallest]
        if (temp && smallestEntry) {
          this.heap[idx] = smallestEntry
          this.heap[smallest] = temp
        }
        idx = smallest
      } else {
        break
      }
    }
  }

  /**
   * Returns true if `right` should be dequeued before `left`.
   * Lower priority value first, then lower sequence.
   */
  private shouldSwap(left: number, right: number): boolean {
    const l = this.heap[left]
    const r = this.heap[right]
    if (!l || !r) return false
    if (r.priority < l.priority) return true
    if (r.priority === l.priority && r.sequence < l.sequence) return true
    return false
  }
}
