/**
 * P14-SEC-AUDIT — Audit Log
 *
 * Records all permission decisions for security auditing.
 * From PermissionManager-Part05: audit events and security posture.
 */

import type { AuditEvent } from "./security-types"

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

export class AuditLog {
  private readonly events: AuditEvent[] = []
  private readonly maxEvents: number

  constructor(maxEvents = 10000) {
    this.maxEvents = maxEvents
  }

  /** Record an audit event */
  record(event: AuditEvent): void {
    this.events.push(event)

    // Evict oldest if at capacity
    if (this.events.length > this.maxEvents) {
      this.events.shift()
    }
  }

  /** Get events */
  getEvents(limit?: number): readonly AuditEvent[] {
    if (limit !== undefined) {
      return this.events.slice(-limit)
    }
    return [...this.events]
  }

  /** Get events for an actor */
  getEventsForActor(actorId: string): readonly AuditEvent[] {
    return this.events.filter((e) => e.actorId === actorId)
  }

  /** Get events for a request */
  getEventsForRequest(requestId: string): readonly AuditEvent[] {
    return this.events.filter((e) => e.requestId === requestId)
  }

  /** Get events by type */
  getEventsByType(type: AuditEvent["type"]): readonly AuditEvent[] {
    return this.events.filter((e) => e.type === type)
  }

  /** Get events in time range */
  getEventsInRange(start: string, end: string): readonly AuditEvent[] {
    return this.events.filter((e) => {
      const time = new Date(e.timestamp)
      return time >= new Date(start) && time <= new Date(end)
    })
  }

  /** Clear audit log */
  clear(): void {
    this.events.length = 0
  }

  /** Get event count */
  get size(): number {
    return this.events.length
  }
}
