/**
 * P07-SESSION-REPLAY — Session Replay
 *
 * Session-Part03: "Every completed Session SHOULD support replay."
 * Replay is read-only. Includes timeline, worker creation/destruction,
 * orchestrator hierarchy, task progression, artifact generation, and runtime events.
 */

import type { SessionId, WorkerId, IsoTimestamp } from "@/core/types"
import type {
  ReplayState,
  ReplayTimelineEntry,
  ReplayConfig,
  ReplayFilter,
  ReplayResult,
  SessionEvent,
} from "./session-types"

// ---------------------------------------------------------------------------
// Replay Engine
// ---------------------------------------------------------------------------

export class SessionReplayEngine {
  private state: ReplayState = "idle"
  private currentConfig: ReplayConfig | null = null
  private timeline: ReplayTimelineEntry[] = []
  private currentIndex: number = 0
  private readonly stateHandlers: Array<(state: ReplayState) => void> = []

  /**
   * Prepare a replay for a session.
   * Session-Part03: "Replay MUST be read-only."
   */
  prepare(
    sessionId: SessionId,
    events: readonly SessionEvent[],
    config?: Partial<ReplayConfig>,
  ): void {
    if (this.state !== "idle" && this.state !== "completed" && this.state !== "failed") {
      throw new Error(`Cannot prepare replay in state '${this.state}'`)
    }

    this.currentConfig = {
      sessionId,
      startEventSeq: config?.startEventSeq,
      endEventSeq: config?.endEventSeq,
      speed: config?.speed ?? 1,
      filter: config?.filter,
    }

    // Build timeline from events
    this.timeline = this.buildTimeline(events, this.currentConfig.filter)
    this.currentIndex = 0
    this.setState("preparing")
  }

  /**
   * Start or resume replay playback.
   */
  play(): void {
    if (this.state !== "preparing" && this.state !== "paused") {
      throw new Error(`Cannot play replay in state '${this.state}'`)
    }
    this.setState("playing")
  }

  /**
   * Pause replay playback.
   */
  pause(): void {
    if (this.state !== "playing") {
      throw new Error(`Cannot pause replay in state '${this.state}'`)
    }
    this.setState("paused")
  }

  /**
   * Advance replay by one event.
   * Returns the current event or null if replay is complete.
   */
  step(): ReplayTimelineEntry | null {
    if (this.state !== "playing" && this.state !== "preparing") {
      return null
    }

    if (this.currentIndex >= this.timeline.length) {
      this.setState("completed")
      return null
    }

    const entry = this.timeline[this.currentIndex]
    this.currentIndex++
    return entry ?? null
  }

  /**
   * Seek to a specific event sequence.
   */
  seekTo(eventSeq: number): void {
    const idx = this.timeline.findIndex(e => e.eventSeq === eventSeq)
    if (idx >= 0) {
      this.currentIndex = idx
    }
  }

  /**
   * Get the current position in the replay.
   */
  getPosition(): { readonly index: number; readonly total: number; readonly eventSeq?: number } {
    const current = this.timeline[this.currentIndex]
    return {
      index: this.currentIndex,
      total: this.timeline.length,
      eventSeq: current?.eventSeq,
    }
  }

  /**
   * Get the full replay result.
   */
  getResult(): ReplayResult {
    const now = new Date().toISOString() as IsoTimestamp
    return {
      sessionId: this.currentConfig?.sessionId ?? "" as SessionId,
      totalEvents: this.timeline.length,
      replayedEvents: this.currentIndex,
      timeline: [...this.timeline],
      startedAt: now,
      completedAt: this.state === "completed" ? now : undefined,
    }
  }

  /**
   * Get current replay state.
   */
  getState(): ReplayState {
    return this.state
  }

  /**
   * Subscribe to state changes.
   */
  onStateChange(handler: (state: ReplayState) => void): () => void {
    this.stateHandlers.push(handler)
    return () => {
      const idx = this.stateHandlers.indexOf(handler)
      if (idx >= 0) this.stateHandlers.splice(idx, 1)
    }
  }

  /**
   * Reset the replay engine.
   */
  reset(): void {
    this.state = "idle"
    this.currentConfig = null
    this.timeline = []
    this.currentIndex = 0
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private buildTimeline(
    events: readonly SessionEvent[],
    filter?: ReplayFilter,
  ): ReplayTimelineEntry[] {
    let filtered = [...events]

    // Apply filter
    if (filter) {
      if (filter.eventTypes && filter.eventTypes.length > 0) {
        const typeSet = new Set(filter.eventTypes)
        filtered = filtered.filter(e => typeSet.has(e.kind))
      }
      if (filter.workerIds && filter.workerIds.length > 0) {
        const workerSet = new Set(filter.workerIds)
        filtered = filtered.filter(e => {
          const workerId = (e.metadata?.workerId as string) ?? ""
          return workerSet.has(workerId as WorkerId)
        })
      }
    }

    // Apply range
    if (this.currentConfig?.startEventSeq !== undefined) {
      filtered = filtered.filter(e => e.eventSeq >= this.currentConfig!.startEventSeq!)
    }
    if (this.currentConfig?.endEventSeq !== undefined) {
      filtered = filtered.filter(e => e.eventSeq <= this.currentConfig!.endEventSeq!)
    }

    // Convert to timeline entries
    return filtered.map(e => ({
      eventSeq: e.eventSeq,
      eventType: e.kind,
      workerId: e.metadata?.workerId as WorkerId | undefined,
      timestamp: e.timestamp,
      payload: e.metadata ?? {},
    }))
  }

  private setState(newState: ReplayState): void {
    this.state = newState
    for (const handler of this.stateHandlers) {
      try {
        handler(newState)
      } catch {
        // Handlers must not throw
      }
    }
  }
}
