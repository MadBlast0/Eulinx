/**
 * P07-SESSION-CREATE — Session Manager Tests
 */

import { describe, it, expect } from "vitest"
import type { SessionId, WorkspaceId, WorkerId } from "@/core/types"
import { SessionManager } from "./session-manager"
import type { SessionCreateRequest } from "./session-types"

function sid(id: string): SessionId { return id as unknown as SessionId }
function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }
function wid(id: string): WorkerId { return id as unknown as WorkerId }

function baseRequest(overrides?: Partial<SessionCreateRequest>): SessionCreateRequest {
  return {
    workspaceId: ws("ws_1"),
    runtimeId: "rt_1",
    kind: "chat",
    ...overrides,
  }
}

describe("SessionManager", () => {
  describe("createSession", () => {
    it("creates a session with correct initial state", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())

      expect(handle.sessionId).toBeTruthy()
      expect(handle.workspaceId).toBe("ws_1")
      expect(handle.state).toBe("created")

      const state = mgr.getSession(handle.sessionId)
      expect(state).toBeDefined()
      expect(state!.state).toBe("created")
      expect(state!.seq).toBe(1)
      expect(state!.kind).toBe("chat")
    })

    it("stores metadata", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest({ kind: "terminal" }))

      const meta = mgr.getMetadata(handle.sessionId)
      expect(meta).toBeDefined()
      expect(meta!.kind).toBe("terminal")
      expect(meta!.runtimeId).toBe("rt_1")
    })

    it("emits session.created event", async () => {
      const mgr = new SessionManager()
      const events: string[] = []
      mgr.onEvent(e => events.push(e.kind))

      await mgr.createSession(baseRequest())
      expect(events).toContain("session.created")
    })

    it("respects maxActiveSessions limit", async () => {
      const mgr = new SessionManager({ maxActiveSessions: 1 })
      await mgr.createSession(baseRequest())

      await expect(mgr.createSession(baseRequest())).rejects.toThrow("Max active sessions")
    })
  })

  describe("initializeSession", () => {
    it("transitions through initialization sequence", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())

      await mgr.initializeSession(handle.sessionId)

      const state = mgr.getSession(handle.sessionId)
      expect(state!.state).toBe("running")
    })

    it("emits all lifecycle events", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())
      const events: string[] = []
      mgr.onEvent(e => events.push(e.kind))

      await mgr.initializeSession(handle.sessionId)

      expect(events).toContain("session.initialized")
      expect(events).toContain("session.workspace_loaded")
      expect(events).toContain("session.services_started")
      expect(events).toContain("session.started")
    })
  })

  describe("pause/resume", () => {
    it("pauses and resumes a running session", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())
      await mgr.initializeSession(handle.sessionId)

      mgr.pauseSession(handle.sessionId, "User requested")
      expect(mgr.getSession(handle.sessionId)!.state).toBe("paused")

      mgr.resumeSession(handle.sessionId, "User resumed")
      expect(mgr.getSession(handle.sessionId)!.state).toBe("running")
    })
  })

  describe("complete/archive", () => {
    it("completes a session", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())
      await mgr.initializeSession(handle.sessionId)

      mgr.completeSession(handle.sessionId)
      expect(mgr.getSession(handle.sessionId)!.state).toBe("completed")
      expect(mgr.getActiveSessionId()).toBeNull()
    })

    it("archives a completed session", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())
      await mgr.initializeSession(handle.sessionId)
      mgr.completeSession(handle.sessionId)

      mgr.archiveSession(handle.sessionId)
      expect(mgr.getSession(handle.sessionId)!.state).toBe("archived")
    })
  })

  describe("fail/cancel", () => {
    it("fails a session", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())
      await mgr.initializeSession(handle.sessionId)

      mgr.failSession(handle.sessionId, "Error occurred")
      expect(mgr.getSession(handle.sessionId)!.state).toBe("failed")
      expect(mgr.getSession(handle.sessionId)!.endedAt).toBeTruthy()
    })

    it("cancels a session", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())

      mgr.cancelSession(handle.sessionId, "User cancelled")
      expect(mgr.getSession(handle.sessionId)!.state).toBe("cancelled")
    })
  })

  describe("worker management", () => {
    it("adds and removes workers", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())

      mgr.addWorker(handle.sessionId, wid("w_1"))
      mgr.addWorker(handle.sessionId, wid("w_2"))

      const state = mgr.getSession(handle.sessionId)!
      expect(state.activeWorkerIds).toEqual(["w_1", "w_2"])

      mgr.removeWorker(handle.sessionId, wid("w_1"))
      expect(mgr.getSession(handle.sessionId)!.activeWorkerIds).toEqual(["w_2"])
    })

    it("respects maxWorkersPerSession limit", async () => {
      const mgr = new SessionManager({ maxWorkersPerSession: 2 })
      const handle = await mgr.createSession(baseRequest())

      mgr.addWorker(handle.sessionId, wid("w_1"))
      mgr.addWorker(handle.sessionId, wid("w_2"))

      expect(() => mgr.addWorker(handle.sessionId, wid("w_3"))).toThrow("Max workers per session")
    })
  })

  describe("task management", () => {
    it("adds and removes tasks", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())

      mgr.addTask(handle.sessionId, "t_1")
      expect(mgr.getSession(handle.sessionId)!.activeTaskIds).toContain("t_1")

      mgr.removeTask(handle.sessionId, "t_1")
      expect(mgr.getSession(handle.sessionId)!.activeTaskIds).not.toContain("t_1")
    })

    it("deduplicates tasks", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())

      mgr.addTask(handle.sessionId, "t_1")
      mgr.addTask(handle.sessionId, "t_1")
      expect(mgr.getSession(handle.sessionId)!.activeTaskIds).toEqual(["t_1"])
    })
  })

  describe("artifact tracking", () => {
    it("adds artifacts and increments metrics", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())

      mgr.addArtifact(handle.sessionId, "art_1")
      mgr.addArtifact(handle.sessionId, "art_2")

      const state = mgr.getSession(handle.sessionId)!
      expect(state.artifactIds).toEqual(["art_1", "art_2"])
      expect(state.metrics.totalArtifactsCreated).toBe(2)
    })
  })

  describe("buildContext", () => {
    it("builds context from current session state", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())
      await mgr.initializeSession(handle.sessionId)

      mgr.addWorker(handle.sessionId, wid("w_1"))
      mgr.addTask(handle.sessionId, "t_1")

      const ctx = mgr.buildContext(handle.sessionId)
      expect(ctx).not.toBeNull()
      expect(ctx!.sessionId).toBe(handle.sessionId)
      expect(ctx!.activeWorkerIds).toEqual(["w_1"])
      expect(ctx!.activeTaskIds).toEqual(["t_1"])
    })

    it("returns null for unknown session", () => {
      const mgr = new SessionManager()
      expect(mgr.buildContext(sid("unknown"))).toBeNull()
    })
  })

  describe("getHistory", () => {
    it("returns all events for a session", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())
      await mgr.initializeSession(handle.sessionId)

      const history = mgr.getHistory(handle.sessionId)
      expect(history.length).toBeGreaterThan(0)
      expect(history[0]!.eventType).toBe("session.created")
    })
  })

  describe("isTerminal / isSessionActive", () => {
    it("correctly identifies terminal and active states", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())
      await mgr.initializeSession(handle.sessionId)

      expect(mgr.isSessionActive(handle.sessionId)).toBe(true)
      expect(mgr.isSessionTerminal(handle.sessionId)).toBe(false)

      mgr.completeSession(handle.sessionId)

      expect(mgr.isSessionActive(handle.sessionId)).toBe(false)
      expect(mgr.isSessionTerminal(handle.sessionId)).toBe(true)
    })
  })

  describe("canTransition", () => {
    it("returns true for valid transitions", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())

      expect(mgr.canTransition(handle.sessionId, "initializing")).toBe(true)
      expect(mgr.canTransition(handle.sessionId, "running")).toBe(false)
    })
  })

  describe("event subscription", () => {
    it("calls handlers on events", async () => {
      const mgr = new SessionManager({ maxActiveSessions: 10 })
      const events: string[] = []
      const unsub = mgr.onEvent(e => events.push(e.kind))

      await mgr.createSession(baseRequest())
      expect(events.length).toBe(1)

      unsub()
      await mgr.createSession(baseRequest())
      expect(events.length).toBe(1)
    })
  })

  describe("error cases", () => {
    it("throws on unknown session transitions", async () => {
      const mgr = new SessionManager()
      const handle = await mgr.createSession(baseRequest())

      expect(() => mgr.transitionSession(handle.sessionId, "running", "Bad")).toThrow("Invalid session transition")
    })

    it("throws on operations for unknown sessions", () => {
      const mgr = new SessionManager()
      expect(() => mgr.addWorker(sid("unknown"), wid("w_1"))).toThrow("not found")
    })
  })
})
