/**
 * P09-MEM-LTM / P09-MEM-EPISODIC / P09-MEM-SEMANTIC — LTM Tests
 */

import { describe, it, expect } from "vitest"
import type { WorkspaceId, SessionId, IsoTimestamp } from "@/core/types"
import { LongTermMemoryStore, EpisodicMemoryStore, SemanticMemoryStore } from "./memory-ltm"
import { DEFAULT_MEMORY_POLICY } from "./memory-policies"
import type { MemoryPolicy } from "./memory-types"

function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }
function sid(id: string): SessionId { return id as unknown as SessionId }

const testPolicy: MemoryPolicy = {
  ...DEFAULT_MEMORY_POLICY,
  workspaceId: ws("ws_1"),
  maxLtmPerWorkspace: 10,
  ltmReviewRequired: false,
}

describe("LongTermMemoryStore", () => {
  describe("promote", () => {
    it("promotes a record to LTM", () => {
      const store = new LongTermMemoryStore(testPolicy)
      const record = store.promote({
        content: "Use pnpm as package manager",
        workspaceId: ws("ws_1"),
        category: "user_preference",
      })

      expect(record.id).toBeTruthy()
      expect(record.kind).toBe("ltm")
      expect(record.category).toBe("user_preference")
      expect(record.reviewStatus).toBe("approved") // no review required
    })
  })

  describe("review", () => {
    it("reviews an LTM record", () => {
      const store = new LongTermMemoryStore({ ...testPolicy, ltmReviewRequired: true })
      const record = store.promote({
        content: "Important rule",
        workspaceId: ws("ws_1"),
        category: "architecture_rule",
      })

      expect(record.reviewStatus).toBe("pending")

      store.review(record.id, "approved")
      expect(store.read(record.id)!.reviewStatus).toBe("approved")
    })
  })

  describe("getForWorkspace / getByCategory", () => {
    it("filters by workspace and category", () => {
      const store = new LongTermMemoryStore(testPolicy)
      store.promote({ content: "A", workspaceId: ws("ws_1"), category: "user_preference" })
      store.promote({ content: "B", workspaceId: ws("ws_1"), category: "architecture_rule" })
      store.promote({ content: "C", workspaceId: ws("ws_2"), category: "user_preference" })

      expect(store.getForWorkspace(ws("ws_1")).length).toBe(2)
      expect(store.getByCategory(ws("ws_1"), "user_preference").length).toBe(1)
    })
  })

  describe("forget", () => {
    it("forgets records matching predicate", () => {
      const store = new LongTermMemoryStore(testPolicy)
      store.promote({ content: "Keep", workspaceId: ws("ws_1"), category: "user_preference" })
      store.promote({ content: "Forget", workspaceId: ws("ws_1"), category: "known_failure" })

      const forgotten = store.forget(r => r.category === "known_failure")
      expect(forgotten).toBe(1)
      expect(store.count(ws("ws_1"))).toBe(1)
    })
  })
})

describe("EpisodicMemoryStore", () => {
  describe("record", () => {
    it("records an episode", () => {
      const store = new EpisodicMemoryStore()
      const record = store.record({
        content: "Ran build successfully",
        workspaceId: ws("ws_1"),
        eventType: "build_success",
        eventTimestamp: new Date().toISOString() as IsoTimestamp,
        participant: "worker_1",
        outcome: "success",
        sessionId: sid("ses_1"),
      })

      expect(record.kind).toBe("episodic")
      expect(record.eventType).toBe("build_success")
      expect(record.outcome).toBe("success")
    })
  })

  describe("getForSession", () => {
    it("filters by session", () => {
      const store = new EpisodicMemoryStore()
      store.record({ content: "A", workspaceId: ws("ws_1"), eventType: "test", eventTimestamp: "" as any, participant: "p1", sessionId: sid("s_1") })
      store.record({ content: "B", workspaceId: ws("ws_1"), eventType: "test", eventTimestamp: "" as any, participant: "p1", sessionId: sid("s_2") })

      expect(store.getForSession(sid("s_1")).length).toBe(1)
    })
  })
})

describe("SemanticMemoryStore", () => {
  describe("store", () => {
    it("stores a semantic fact", () => {
      const store = new SemanticMemoryStore()
      const record = store.store({
        content: "Eulinx uses Tauri v2 for desktop",
        workspaceId: ws("ws_1"),
        factType: "definition",
        confidence: 0.95,
      })

      expect(record.kind).toBe("semantic")
      expect(record.factType).toBe("definition")
      expect(record.confidence).toBe(0.95)
    })
  })

  describe("getByType", () => {
    it("filters by fact type", () => {
      const store = new SemanticMemoryStore()
      store.store({ content: "A", workspaceId: ws("ws_1"), factType: "definition" })
      store.store({ content: "B", workspaceId: ws("ws_1"), factType: "rule" })
      store.store({ content: "C", workspaceId: ws("ws_1"), factType: "definition" })

      expect(store.getByType(ws("ws_1"), "definition").length).toBe(2)
    })
  })
})
