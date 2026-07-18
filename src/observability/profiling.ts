/**
 * P19-OBS-PROFILE — Performance Profiling
 *
 * CPU and memory profiling for performance analysis.
 * From RuntimeManager-Part01 §Runtime Diagnostics.
 */

import type { ProfileEvent, ProfileSession, ProfileSummary, ProfileEventType } from "./observability-types"

// ---------------------------------------------------------------------------
// Profiler
// ---------------------------------------------------------------------------

export class Profiler {
  private sessions = new Map<string, ProfileSession>()
  private currentSessionId: string | null = null

  /**
   * Start a profiling session.
   */
  startSession(): string {
    const profileId = `prof_${Date.now().toString(36)}`
    const session: ProfileSession = {
      profileId,
      startTime: new Date().toISOString() as any,
      events: [],
      summary: {
        totalDurationMs: 0,
        cpuTimeMs: 0,
        memoryPeakBytes: 0,
        gcCount: 0,
        gcPauseMs: 0,
        eventLoopLagMs: 0,
      },
    }
    this.sessions.set(profileId, session)
    this.currentSessionId = profileId
    return profileId
  }

  /**
   * Record a profiling event.
   */
  recordEvent(type: ProfileEventType, durationMs: number, details: Record<string, unknown> = {}): void {
    if (!this.currentSessionId) return
    const session = this.sessions.get(this.currentSessionId)
    if (!session) return

    const event: ProfileEvent = {
      type,
      timestamp: new Date().toISOString() as any,
      durationMs,
      details,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(session as any).events.push(event)
    this.updateSummary(session)
  }

  /**
   * Stop the current profiling session.
   */
  stopSession(): ProfileSession | undefined {
    if (!this.currentSessionId) return undefined
    const session = this.sessions.get(this.currentSessionId)
    if (!session) return undefined

    const stopped = {
      ...session,
      endTime: new Date().toISOString() as any,
    }
    this.sessions.set(this.currentSessionId, stopped)
    this.currentSessionId = null
    return stopped
  }

  /**
   * Get a profile session by ID.
   */
  getSession(profileId: string): ProfileSession | undefined {
    return this.sessions.get(profileId)
  }

  /**
   * Get all profile sessions.
   */
  getAllSessions(): ProfileSession[] {
    return [...this.sessions.values()]
  }

  /**
   * Clear all sessions.
   */
  clear(): void {
    this.sessions.clear()
    this.currentSessionId = null
  }

  private updateSummary(session: ProfileSession): void {
    const events = session.events
    const summary: ProfileSummary = {
      totalDurationMs: events.reduce((sum, e) => sum + e.durationMs, 0),
      cpuTimeMs: events.filter((e) => e.type === "cpu").reduce((sum, e) => sum + e.durationMs, 0),
      memoryPeakBytes: Math.max(
        ...events.filter((e) => e.type === "memory").map((e) => (e.details.bytes as number) ?? 0),
        0,
      ),
      gcCount: events.filter((e) => e.type === "gc").length,
      gcPauseMs: events.filter((e) => e.type === "gc").reduce((sum, e) => sum + e.durationMs, 0),
      eventLoopLagMs: events.filter((e) => e.type === "event_loop").reduce((sum, e) => sum + e.durationMs, 0),
    }
    ;(session as { summary: ProfileSummary }).summary = summary
  }
}
