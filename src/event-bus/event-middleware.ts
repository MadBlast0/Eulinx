/**
 * P03-EVENT-MIDDLEWARE — Event Interceptors
 *
 * Middleware pipeline for intercepting events before delivery.
 * Middleware can transform, filter, or add metadata to events.
 *
 * IMPORTANT: Middleware MUST NOT:
 *   - Mutate event payloads (immutable after publication)
 *   - Block delivery or cause backpressure
 *   - Veto events (the bus is not a control channel)
 */

import type { EulinxEventUnion } from "./event-types"

// ---------------------------------------------------------------------------
// Middleware types
// ---------------------------------------------------------------------------

export type MiddlewareNext = (event: EulinxEventUnion) => EulinxEventUnion | null

export type EventMiddleware = {
  readonly name: string
  readonly priority: number
  process: (event: EulinxEventUnion, next: MiddlewareNext) => EulinxEventUnion | null
}

// ---------------------------------------------------------------------------
// Middleware pipeline
// ---------------------------------------------------------------------------

/**
 * Ordered middleware pipeline. Executes in priority order (lower = earlier).
 * A middleware can:
 *   - Pass the event through (return next(event))
 *   - Drop the event (return null)
 *   - Transform metadata (return a new event with same payload)
 *
 * Middleware MUST NOT mutate the event payload. The payload is immutable
 * after publication (EventBus-Part01 §Invariants).
 */
export class MiddlewarePipeline {
  private readonly middlewares: EventMiddleware[] = []
  private sorted = true

  add(middleware: EventMiddleware): void {
    this.middlewares.push(middleware)
    this.sorted = false
  }

  remove(name: string): boolean {
    const idx = this.middlewares.findIndex((m) => m.name === name)
    if (idx === -1) return false
    this.middlewares.splice(idx, 1)
    return true
  }

  clear(): void {
    this.middlewares.length = 0
  }

  get size(): number {
    return this.middlewares.length
  }

  /**
   * Process an event through the middleware pipeline.
   * Returns null if any middleware dropped the event.
   */
  process(event: EulinxEventUnion): EulinxEventUnion | null {
    if (this.middlewares.length === 0) return event

    if (!this.sorted) {
      this.middlewares.sort((a, b) => a.priority - b.priority)
      this.sorted = true
    }

    let currentEvent: EulinxEventUnion | null = event
    let index = 0

    const next: MiddlewareNext = (e: EulinxEventUnion) => {
      if (currentEvent === null) return null
      index++
      if (index >= this.middlewares.length) return e
      const mw = this.middlewares[index]
      return mw ? mw.process(e, next) : e
    }

    const firstMw = this.middlewares[0]
    if (!firstMw) return event
    currentEvent = firstMw.process(event, next)
    return currentEvent
  }
}

// ---------------------------------------------------------------------------
// Built-in middleware factories
// ---------------------------------------------------------------------------

/**
 * Logging middleware — logs event type and sequence for debugging.
 */
export function createLoggingMiddleware(
  logFn: (msg: string) => void = console.log,
): EventMiddleware {
  return {
    name: "logging",
    priority: 0,
    process: (event, next) => {
      logFn(`[EventBus] ${event.type} seq=${event.sequence} id=${event.eventId}`)
      return next(event)
    },
  }
}

/**
 * Replay-grade filter middleware — drops non-replay-grade events.
 */
export function createReplayGradeFilter(): EventMiddleware {
  return {
    name: "replay-grade-filter",
    priority: 100,
    process: (event, next) => {
      return event.replayGrade ? next(event) : null
    },
  }
}

/**
 * Workspace scope middleware — drops events outside the configured workspace.
 */
export function createWorkspaceScopeFilter(targetWorkspaceId: string): EventMiddleware {
  return {
    name: "workspace-scope",
    priority: 10,
    process: (event, next) => {
      return event.workspaceId === targetWorkspaceId ? next(event) : null
    },
  }
}
