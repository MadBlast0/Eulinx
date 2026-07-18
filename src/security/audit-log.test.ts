/**
 * P14-SEC-AUDIT — Audit Log Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { AuditLog } from "./audit-log"
import type { AuditEvent } from "./security-types"

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

function createMockEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: "audit-1",
    type: "permission.decided",
    requestId: "req-1",
    actorId: "worker-1",
    actorType: "worker",
    action: "read",
    resourceType: "filesystem",
    decision: "allow",
    reason: "Test event",
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AuditLog", () => {
  let log: AuditLog

  beforeEach(() => {
    log = new AuditLog(100)
  })

  it("records events", () => {
    log.record(createMockEvent())
    expect(log.size).toBe(1)
  })

  it("gets events", () => {
    log.record(createMockEvent({ id: "audit-1" }))
    log.record(createMockEvent({ id: "audit-2" }))

    const events = log.getEvents()
    expect(events).toHaveLength(2)
  })

  it("limits events", () => {
    log.record(createMockEvent({ id: "audit-1" }))
    log.record(createMockEvent({ id: "audit-2" }))
    log.record(createMockEvent({ id: "audit-3" }))

    const events = log.getEvents(2)
    expect(events).toHaveLength(2)
    expect(events[0].id).toBe("audit-2")
  })

  it("evicts oldest when at capacity", () => {
    for (let i = 0; i < 101; i++) {
      log.record(createMockEvent({ id: `audit-${i}` }))
    }

    expect(log.size).toBe(100)
    expect(log.getEvents()[0].id).toBe("audit-1")
  })

  it("filters by actor", () => {
    log.record(createMockEvent({ actorId: "worker-1" }))
    log.record(createMockEvent({ actorId: "worker-2" }))
    log.record(createMockEvent({ actorId: "worker-1" }))

    const events = log.getEventsForActor("worker-1")
    expect(events).toHaveLength(2)
  })

  it("filters by request", () => {
    log.record(createMockEvent({ requestId: "req-1" }))
    log.record(createMockEvent({ requestId: "req-2" }))

    const events = log.getEventsForRequest("req-1")
    expect(events).toHaveLength(1)
  })

  it("filters by type", () => {
    log.record(createMockEvent({ type: "permission.decided" }))
    log.record(createMockEvent({ type: "permission.granted" }))

    const events = log.getEventsByType("permission.granted")
    expect(events).toHaveLength(1)
  })

  it("clears log", () => {
    log.record(createMockEvent())
    log.clear()

    expect(log.size).toBe(0)
  })
})
