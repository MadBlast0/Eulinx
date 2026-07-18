/**
 * P07-SESSION-REPLAY — Session Replay Tests
 */

import { describe, it, expect } from "vitest"
import type { SessionId } from "@/core/types"
import { SessionReplayEngine } from "./session-replay"
import type { SessionEvent } from "./session-types"

function sid(id: string): SessionId { return id as unknown as SessionId }

function mockEvents(count: number): SessionEvent[] {
  const now = new Date().toISOString()
  return Array.from({ length: count }, (_, i) => ({
    kind: "session.started" as const,
    sessionId: sid("ses_1"),
    workspaceId: "ws_1" as any,
    eventSeq: i + 1,
    timestamp: now as any,
    actor: "system",
    detail: `Event ${i + 1}`,
  }))
}

describe("SessionReplayEngine", () => {
  describe("prepare", () => {
    it("prepares a replay from events", () => {
      const engine = new SessionReplayEngine()
      const events = mockEvents(5)

      engine.prepare(sid("ses_1"), events)

      expect(engine.getState()).toBe("preparing")
      const pos = engine.getPosition()
      expect(pos.total).toBe(5)
      expect(pos.index).toBe(0)
    })

    it("throws if already playing", () => {
      const engine = new SessionReplayEngine()
      engine.prepare(sid("ses_1"), mockEvents(3))
      engine.play()

      expect(() => engine.prepare(sid("ses_1"), mockEvents(3))).toThrow("Cannot prepare replay")
    })
  })

  describe("play / pause", () => {
    it("plays and pauses", () => {
      const engine = new SessionReplayEngine()
      engine.prepare(sid("ses_1"), mockEvents(3))

      engine.play()
      expect(engine.getState()).toBe("playing")

      engine.pause()
      expect(engine.getState()).toBe("paused")
    })

    it("throws if cannot play", () => {
      const engine = new SessionReplayEngine()
      expect(() => engine.play()).toThrow("Cannot play replay")
    })

    it("throws if cannot pause", () => {
      const engine = new SessionReplayEngine()
      engine.prepare(sid("ses_1"), mockEvents(3))
      expect(() => engine.pause()).toThrow("Cannot pause replay")
    })
  })

  describe("step", () => {
    it("steps through events", () => {
      const engine = new SessionReplayEngine()
      engine.prepare(sid("ses_1"), mockEvents(3))
      engine.play()

      const e1 = engine.step()
      expect(e1).not.toBeNull()
      expect(e1!.eventSeq).toBe(1)

      const e2 = engine.step()
      expect(e2!.eventSeq).toBe(2)

      const e3 = engine.step()
      expect(e3!.eventSeq).toBe(3)

      // End of replay
      const e4 = engine.step()
      expect(e4).toBeNull()
      expect(engine.getState()).toBe("completed")
    })

    it("returns null when not playing", () => {
      const engine = new SessionReplayEngine()
      expect(engine.step()).toBeNull()
    })
  })

  describe("seekTo", () => {
    it("seeks to a specific event", () => {
      const engine = new SessionReplayEngine()
      engine.prepare(sid("ses_1"), mockEvents(10))
      engine.play()

      engine.seekTo(5)
      const entry = engine.step()
      expect(entry!.eventSeq).toBe(5)
    })
  })

  describe("filter", () => {
    it("filters events by type", () => {
      const engine = new SessionReplayEngine()
      const events: SessionEvent[] = [
        { kind: "session.started", sessionId: sid("ses_1"), workspaceId: "ws_1" as any, eventSeq: 1, timestamp: "" as any, actor: "system" },
        { kind: "session.paused", sessionId: sid("ses_1"), workspaceId: "ws_1" as any, eventSeq: 2, timestamp: "" as any, actor: "system" },
        { kind: "session.started", sessionId: sid("ses_1"), workspaceId: "ws_1" as any, eventSeq: 3, timestamp: "" as any, actor: "system" },
      ]

      engine.prepare(sid("ses_1"), events, { filter: { eventTypes: ["session.started"] } })

      const pos = engine.getPosition()
      expect(pos.total).toBe(2)
    })

    it("filters events by range", () => {
      const engine = new SessionReplayEngine()
      engine.prepare(sid("ses_1"), mockEvents(10), { startEventSeq: 3, endEventSeq: 7 })

      const pos = engine.getPosition()
      expect(pos.total).toBe(5)
    })
  })

  describe("getResult", () => {
    it("returns result with replayed count", () => {
      const engine = new SessionReplayEngine()
      engine.prepare(sid("ses_1"), mockEvents(5))
      engine.play()

      engine.step()
      engine.step()

      const result = engine.getResult()
      expect(result.totalEvents).toBe(5)
      expect(result.replayedEvents).toBe(2)
    })
  })

  describe("reset", () => {
    it("resets to idle", () => {
      const engine = new SessionReplayEngine()
      engine.prepare(sid("ses_1"), mockEvents(3))
      engine.play()
      engine.step()

      engine.reset()
      expect(engine.getState()).toBe("idle")
      expect(engine.getPosition().total).toBe(0)
    })
  })

  describe("state change subscription", () => {
    it("notifies on state changes", () => {
      const engine = new SessionReplayEngine()
      const states: string[] = []
      engine.onStateChange(s => states.push(s))

      engine.prepare(sid("ses_1"), mockEvents(1))
      engine.play()
      engine.step() // returns the event
      engine.step() // null → completed

      expect(states).toEqual(["preparing", "playing", "completed"])
    })
  })
})
