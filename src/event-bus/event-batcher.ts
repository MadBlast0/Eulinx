/**
 * P03-EVENT-BATCHER — UI Event Batcher
 *
 * From EventBus-Part04 §The Tauri Event Bridge and §Batching.
 * Accumulates events and flushes them to the UI in batches.
 *
 * Key rules:
 *   - Batch interval: 50ms (below ~100ms laggy threshold)
 *   - Max batch size: 200 events
 *   - Replay-grade events force immediate flush
 *   - Output stream events are coalesced by source key
 *   - Progress events are coalesced by replacement
 */

import type { EulinxEventUnion } from "./event-types"
import type { EventBusConfig } from "./event-bus-config"
import { shouldFlushImmediately } from "./event-types"

// ---------------------------------------------------------------------------
// Event batch (EventBus-Part04 §The Tauri Event Bridge)
// ---------------------------------------------------------------------------

export type EventBatch = {
  readonly batchId: string
  readonly events: EulinxEventUnion[]
  readonly firstSequence: number
  readonly lastSequence: number
  readonly droppedSinceLastBatch: number
  readonly emittedAt: string
}

// ---------------------------------------------------------------------------
// Coalescing keys
// ---------------------------------------------------------------------------

type OutputCoalesceKey = string // `${eventType}:${workerId}:${channel}`
type ProgressCoalesceKey = string // `${eventType}:${executionId}`

// ---------------------------------------------------------------------------
// UI Batcher
// ---------------------------------------------------------------------------

export class UiBatcher {
  private openBatch: EulinxEventUnion[] = []
  private batchOpenedAt = 0
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private droppedSinceLastBatch = 0
  private totalEventsBatched = 0

  // Coalescing state
  private outputCoalesceMap = new Map<OutputCoalesceKey, number>() // index into openBatch
  private progressCoalesceMap = new Map<ProgressCoalesceKey, number>() // index into openBatch

  private readonly config: EventBusConfig
  private readonly onFlush: (batch: EventBatch) => void

  constructor(config: EventBusConfig, onFlush: (batch: EventBatch) => void) {
    this.config = config
    this.onFlush = onFlush
  }

  /**
   * Add an event to the open batch.
   * Handles coalescing for high-frequency events.
   * Triggers immediate flush for replay-grade critical events.
   */
  push(event: EulinxEventUnion): void {
    // Replay-grade events force immediate flush (EventBus-Part04 §Batching)
    if (shouldFlushImmediately(event.type)) {
      // Flush current batch first
      if (this.openBatch.length > 0) {
        this.flush()
      }
      // Emit this event immediately
      this.onFlush({
        batchId: generateBatchId(),
        events: [event],
        firstSequence: event.sequence,
        lastSequence: event.sequence,
        droppedSinceLastBatch: 0,
        emittedAt: new Date().toISOString(),
      })
      return
    }

    // Output stream coalescing (EventBus-Part04 §Output Stream Coalescing)
    if (event.type === "worker.output_streamed" || event.type === "process.output_streamed") {
      const payload = event.payload as { workerId?: string; processId?: string; channel: string; chunk: string; chunkIndex: number }
      const sourceId = payload.workerId ?? payload.processId ?? ""
      const key = `${event.type}:${sourceId}:${payload.channel}`

      const existingIdx = this.outputCoalesceMap.get(key)
      if (existingIdx !== undefined && existingIdx < this.openBatch.length) {
        // Append chunk to existing event
        const existing = this.openBatch[existingIdx]
        if (existing) {
          const existingPayload = existing.payload as { chunk: string; chunkIndex: number; truncatedBytes?: number }
          const newChunk = existingPayload.chunk + payload.chunk

          // Cap at 64 KiB (EventBus-Part04 §Output Stream Coalescing rule 4)
          let truncatedBytes = 0
          let finalChunk = newChunk
          if (newChunk.length > this.config.coalescedChunkMaxBytes) {
            finalChunk = newChunk.slice(newChunk.length - this.config.coalescedChunkMaxBytes)
            truncatedBytes = newChunk.length - finalChunk.length
          }

          this.openBatch[existingIdx] = {
            ...existing,
            payload: {
              ...existingPayload,
              chunk: finalChunk,
              chunkIndex: payload.chunkIndex,
              truncatedBytes: (existingPayload.truncatedBytes ?? 0) + truncatedBytes,
            },
          } as unknown as EulinxEventUnion
          return
        }
      }

      // New coalesced entry
      const idx = this.openBatch.length
      this.openBatch.push(event)
      this.outputCoalesceMap.set(key, idx)
      this.maybeScheduleFlush()
      return
    }

    // Progress coalescing (EventBus-Part04 §Progress Coalescing)
    if (event.type === "execution.progress_reported") {
      const payload = event.payload as { executionId: string }
      const key = `${event.type}:${payload.executionId}`

      const existingIdx = this.progressCoalesceMap.get(key)
      if (existingIdx !== undefined && existingIdx < this.openBatch.length) {
        // Replace entirely — newest wins (progress is absolute)
        this.openBatch[existingIdx] = event
        return
      }

      // New entry
      const idx = this.openBatch.length
      this.openBatch.push(event)
      this.progressCoalesceMap.set(key, idx)
      this.maybeScheduleFlush()
      return
    }

    // Default: append to batch
    this.openBatch.push(event)
    this.maybeScheduleFlush()
  }

  /**
   * Record a dropped event (for droppedSinceLastBatch).
   */
  recordDrop(): void {
    this.droppedSinceLastBatch++
  }

  /**
   * Flush the current batch immediately.
   */
  flush(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    if (this.openBatch.length === 0) return

    const first = this.openBatch[0]
    const last = this.openBatch[this.openBatch.length - 1]
    if (!first || !last) return

    const batch: EventBatch = {
      batchId: generateBatchId(),
      events: [...this.openBatch],
      firstSequence: first.sequence,
      lastSequence: last.sequence,
      droppedSinceLastBatch: this.droppedSinceLastBatch,
      emittedAt: new Date().toISOString(),
    }

    this.openBatch = []
    this.batchOpenedAt = 0
    this.droppedSinceLastBatch = 0
    this.outputCoalesceMap.clear()
    this.progressCoalesceMap.clear()
    this.totalEventsBatched += batch.events.length

    this.onFlush(batch)
  }

  /**
   * Shutdown the batcher — flush remaining events.
   */
  shutdown(): void {
    this.flush()
  }

  /**
   * Get batcher statistics.
   */
  get stats(): {
    readonly openBatchSize: number
    readonly totalEventsBatched: number
    readonly droppedSinceLastBatch: number
  } {
    return {
      openBatchSize: this.openBatch.length,
      totalEventsBatched: this.totalEventsBatched,
      droppedSinceLastBatch: this.droppedSinceLastBatch,
    }
  }

  private maybeScheduleFlush(): void {
    if (this.batchOpenedAt === 0) {
      this.batchOpenedAt = Date.now()
    }

    // Max batch size reached → flush immediately
    if (this.openBatch.length >= this.config.uiBatchMaxSize) {
      this.flush()
      return
    }

    // Schedule timer flush if not already scheduled
    if (this.flushTimer === null) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null
        this.flush()
      }, this.config.uiBatchIntervalMs)
    }
  }
}

// ---------------------------------------------------------------------------
// Batch ID generator
// ---------------------------------------------------------------------------

let batchCounter = 0

function generateBatchId(): string {
  batchCounter++
  return `batch_${Date.now()}_${batchCounter}`
}
