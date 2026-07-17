import { describe, it, expect } from "vitest"
import {
  isEventPrunable,
  toPersistedEnvelope,
  fromPersistedEnvelope,
  LOG_FLUSH_INTERVAL_MS,
  LOG_BATCH_SIZE,
  DEFAULT_RETENTION_POLICY,
} from "./event-history"
import type { EulinxEventUnion } from "./event-types"
import type { WorkspaceId } from "@/core/types"

function createTestEvent(type: string, executionId?: string): EulinxEventUnion {
  return {
    eventId: "evt_test",
    sequence: 1,
    type,
    payload: { key: "value" },
    source: { service: "RuntimeManager" },
    workspaceId: "ws_test" as WorkspaceId,
    executionId,
    replayGrade: true,
    emittedAt: "2026-01-01T00:00:00.000Z",
  } as unknown as EulinxEventUnion
}

describe("event-history", () => {
  describe("isEventPrunable", () => {
    it("prunable if old enough", () => {
      const envelope = {
        sequence: 1,
        eventId: "e1",
        type: "worker.spawned",
        payload: "{}",
        service: "RuntimeManager",
        workspaceId: "ws_1",
        emittedAt: "2025-01-01T00:00:00.000Z",
      }
      const pruneHorizon = new Date("2026-06-01").getTime()
      expect(isEventPrunable(envelope, pruneHorizon, new Set())).toBe(true)
    })

    it("not prunable if recent", () => {
      const envelope = {
        sequence: 1,
        eventId: "e1",
        type: "worker.spawned",
        payload: "{}",
        service: "RuntimeManager",
        workspaceId: "ws_1",
        emittedAt: "2026-07-01T00:00:00.000Z",
      }
      const pruneHorizon = new Date("2026-06-01").getTime()
      expect(isEventPrunable(envelope, pruneHorizon, new Set())).toBe(false)
    })

    it("not prunable if merge event", () => {
      const envelope = {
        sequence: 1,
        eventId: "e1",
        type: "merge.applied",
        payload: "{}",
        service: "MergeManager",
        workspaceId: "ws_1",
        emittedAt: "2025-01-01T00:00:00.000Z",
      }
      const pruneHorizon = new Date("2026-06-01").getTime()
      expect(isEventPrunable(envelope, pruneHorizon, new Set())).toBe(false)
    })

    it("not prunable if permission event", () => {
      const envelope = {
        sequence: 1,
        eventId: "e1",
        type: "permission.granted",
        payload: "{}",
        service: "PermissionManager",
        workspaceId: "ws_1",
        emittedAt: "2025-01-01T00:00:00.000Z",
      }
      const pruneHorizon = new Date("2026-06-01").getTime()
      expect(isEventPrunable(envelope, pruneHorizon, new Set())).toBe(false)
    })

    it("not prunable if execution still retained", () => {
      const envelope = {
        sequence: 1,
        eventId: "e1",
        type: "worker.spawned",
        payload: "{}",
        service: "WorkerSpawner",
        workspaceId: "ws_1",
        executionId: "exe_1",
        emittedAt: "2025-01-01T00:00:00.000Z",
      }
      const pruneHorizon = new Date("2026-06-01").getTime()
      expect(isEventPrunable(envelope, pruneHorizon, new Set(["exe_1"]))).toBe(false)
    })
  })

  describe("toPersistedEnvelope", () => {
    it("converts EulinxEvent to PersistedEventEnvelope", () => {
      const event = createTestEvent("worker.spawned")
      const envelope = toPersistedEnvelope(event)

      expect(envelope.eventId).toBe(event.eventId)
      expect(envelope.sequence).toBe(event.sequence)
      expect(envelope.type).toBe("worker.spawned")
      expect(envelope.service).toBe("RuntimeManager")
      expect(typeof envelope.payload).toBe("string")
      expect(JSON.parse(envelope.payload)).toEqual({ key: "value" })
    })
  })

  describe("fromPersistedEnvelope", () => {
    it("converts PersistedEventEnvelope back to EulinxEvent", () => {
      const event = createTestEvent("worker.spawned")
      const envelope = toPersistedEnvelope(event)
      const restored = fromPersistedEnvelope(envelope)

      expect(restored.eventId).toBe(event.eventId)
      expect(restored.sequence).toBe(event.sequence)
      expect(restored.type).toBe("worker.spawned")
      expect(restored.replayGrade).toBe(true)
    })
  })

  describe("constants", () => {
    it("log flush interval is 10ms", () => {
      expect(LOG_FLUSH_INTERVAL_MS).toBe(10)
    })

    it("log batch size is 100", () => {
      expect(LOG_BATCH_SIZE).toBe(100)
    })

    it("retention policy has correct defaults", () => {
      expect(DEFAULT_RETENTION_POLICY.logRetentionDays).toBe(30)
      expect(DEFAULT_RETENTION_POLICY.logMaxBytes).toBe(2 * 1024 * 1024 * 1024)
      expect(DEFAULT_RETENTION_POLICY.pruneIntervalHours).toBe(24)
    })
  })
})
