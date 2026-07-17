import { describe, it, expect } from "vitest"
import {
  isValidTopicPattern,
  matchesTopic,
  matchesFilter,
  PLUGIN_SUBSCRIPTION_LIMIT,
} from "./event-subscriptions"
import type { WorkspaceId, SessionId, ExecutionId } from "@/core/types"

// Test helper to create branded types
function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }
function ses(id: string): SessionId { return id as unknown as SessionId }
function exe(id: string): ExecutionId { return id as unknown as ExecutionId }

describe("event-subscriptions", () => {
  describe("isValidTopicPattern", () => {
    it("accepts exact patterns", () => {
      expect(isValidTopicPattern("worker.spawned")).toBe(true)
      expect(isValidTopicPattern("merge.applied")).toBe(true)
    })

    it("accepts family wildcard", () => {
      expect(isValidTopicPattern("worker.*")).toBe(true)
      expect(isValidTopicPattern("merge.*")).toBe(true)
    })

    it("accepts full wildcard", () => {
      expect(isValidTopicPattern("*")).toBe(true)
    })

    it("rejects empty pattern", () => {
      expect(isValidTopicPattern("")).toBe(false)
    })

    it("rejects leading wildcard", () => {
      expect(isValidTopicPattern("*.failed")).toBe(false)
    })

    it("rejects partial segment wildcard", () => {
      expect(isValidTopicPattern("worker.out*")).toBe(false)
    })

    it("rejects mid-pattern wildcard", () => {
      expect(isValidTopicPattern("worker.*.chunk")).toBe(false)
    })
  })

  describe("matchesTopic", () => {
    it("matches exact pattern", () => {
      expect(matchesTopic("worker.spawned", "worker.spawned")).toBe(true)
      expect(matchesTopic("worker.spawned", "worker.ready")).toBe(false)
    })

    it("matches family wildcard", () => {
      expect(matchesTopic("worker.*", "worker.spawned")).toBe(true)
      expect(matchesTopic("worker.*", "worker.ready")).toBe(true)
      expect(matchesTopic("worker.*", "merge.applied")).toBe(false)
    })

    it("matches full wildcard", () => {
      expect(matchesTopic("*", "worker.spawned")).toBe(true)
      expect(matchesTopic("*", "merge.applied")).toBe(true)
    })

    it("rejects mismatched segments", () => {
      expect(matchesTopic("worker.spawned", "worker.spawned.extra")).toBe(false)
      expect(matchesTopic("worker.spawned.extra", "worker.spawned")).toBe(false)
    })
  })

  describe("matchesFilter", () => {
    const defaultFilter = {
      topics: ["worker.*"],
    }

    it("matches by topic", () => {
      expect(matchesFilter(defaultFilter, "worker.spawned", ws("ws_1"))).toBe(true)
      expect(matchesFilter(defaultFilter, "merge.applied", ws("ws_1"))).toBe(false)
    })

    it("filters by workspace", () => {
      const filter = { topics: ["worker.*"], workspaceId: ws("ws_1") }
      expect(matchesFilter(filter, "worker.spawned", ws("ws_1"))).toBe(true)
      expect(matchesFilter(filter, "worker.spawned", ws("ws_2"))).toBe(false)
    })

    it("filters by session", () => {
      const filter = { topics: ["worker.*"], sessionId: ses("ses_1") }
      expect(matchesFilter(filter, "worker.spawned", ws("ws_1"), ses("ses_1"))).toBe(true)
      expect(matchesFilter(filter, "worker.spawned", ws("ws_1"), ses("ses_2"))).toBe(false)
    })

    it("filters by execution", () => {
      const filter = { topics: ["worker.*"], executionId: exe("exe_1") }
      expect(matchesFilter(filter, "worker.spawned", ws("ws_1"), undefined, exe("exe_1"))).toBe(true)
      expect(matchesFilter(filter, "worker.spawned", ws("ws_1"), undefined, exe("exe_2"))).toBe(false)
    })

    it("filters by replayGradeOnly", () => {
      const filter = { topics: ["worker.*"], replayGradeOnly: true }
      expect(matchesFilter(filter, "worker.spawned", ws("ws_1"), undefined, undefined, true)).toBe(true)
      expect(matchesFilter(filter, "worker.output_streamed", ws("ws_1"), undefined, undefined, false)).toBe(false)
    })

    it("rejects empty topics", () => {
      expect(matchesFilter({ topics: [] }, "worker.spawned", ws("ws_1"))).toBe(false)
    })

    it("multiple topics are ORed", () => {
      const filter = { topics: ["worker.*", "merge.*"] }
      expect(matchesFilter(filter, "worker.spawned", ws("ws_1"))).toBe(true)
      expect(matchesFilter(filter, "merge.applied", ws("ws_1"))).toBe(true)
      expect(matchesFilter(filter, "permission.denied", ws("ws_1"))).toBe(false)
    })
  })

  describe("PLUGIN_SUBSCRIPTION_LIMIT", () => {
    it("is 32", () => {
      expect(PLUGIN_SUBSCRIPTION_LIMIT).toBe(32)
    })
  })
})
