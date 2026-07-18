/**
 * P19-OBS-TRACING — Request Tracing
 *
 * Distributed tracing for debugging and performance analysis.
 * From RuntimeManager-Part01 §Runtime Diagnostics.
 */

import type { TraceSpan, TraceSpanStatus, TraceEvent } from "./observability-types"

// ---------------------------------------------------------------------------
// Tracer
// ---------------------------------------------------------------------------

export class Tracer {
  private readonly spans = new Map<string, TraceSpan>()
  private readonly activeSpans = new Map<string, string>() // traceId -> spanId

  /**
   * Start a new trace span.
   */
  startSpan(
    name: string,
    service: string,
    operation: string,
    parentSpanId?: string,
    attributes: Record<string, string | number | boolean> = {},
  ): { traceId: string; spanId: string } {
    const traceId = parentSpanId
      ? this.spans.get(parentSpanId)?.traceId ?? this.generateId()
      : this.generateId()
    const spanId = this.generateId()

    const span: TraceSpan = {
      traceId,
      spanId,
      parentSpanId: parentSpanId ?? null,
      name,
      service,
      operation,
      startTime: new Date().toISOString() as any,
      status: "ok",
      attributes,
      events: [],
    }

    this.spans.set(spanId, span)
    this.activeSpans.set(traceId, spanId)
    return { traceId, spanId }
  }

  /**
   * Add an event to a span.
   */
  addEvent(spanId: string, name: string, attributes: Record<string, string | number | boolean> = {}): void {
    const span = this.spans.get(spanId)
    if (!span) return
    const event: TraceEvent = {
      name,
      timestamp: new Date().toISOString() as any,
      attributes,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(span as any).events.push(event)
  }

  /**
   * Finish a span with a status.
   */
  finishSpan(spanId: string, status: TraceSpanStatus = "ok"): TraceSpan | undefined {
    const span = this.spans.get(spanId)
    if (!span) return undefined

    const finished = {
      ...span,
      endTime: new Date().toISOString() as any,
      durationMs: Date.now() - new Date(span.startTime).getTime(),
      status,
    }
    this.spans.set(spanId, finished)
    return finished
  }

  /**
   * Get a span by ID.
   */
  getSpan(spanId: string): TraceSpan | undefined {
    return this.spans.get(spanId)
  }

  /**
   * Get all spans for a trace.
   */
  getTraceSpans(traceId: string): TraceSpan[] {
    return [...this.spans.values()].filter((s) => s.traceId === traceId)
  }

  /**
   * Get all completed spans.
   */
  getAllSpans(): TraceSpan[] {
    return [...this.spans.values()].filter((s) => s.endTime !== undefined)
  }

  /**
   * Clear all spans.
   */
  clear(): void {
    this.spans.clear()
    this.activeSpans.clear()
  }

  private generateId(): string {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  }
}
