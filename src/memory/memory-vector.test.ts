/**
 * P09-MEM-EMBED / P09-MEM-SEARCH — Vector Memory & Search Tests
 */

import { describe, it, expect } from "vitest"
import type { WorkspaceId, SessionId, WorkerId, IsoTimestamp } from "@/core/types"
import { VectorMemoryStore, MemorySearchEngine } from "./memory-vector"
import type { MemoryRecord } from "./memory-types"

function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }
function sid(id: string): SessionId { return id as unknown as SessionId }
function wid(id: string): WorkerId { return id as unknown as WorkerId }

function mockRecord(overrides?: Partial<MemoryRecord>): MemoryRecord {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    id: "mem_1",
    kind: "stm",
    scope: "worker",
    workspaceId: ws("ws_1"),
    content: "Test memory content about React hooks",
    sensitivity: "internal",
    tags: ["react", "hooks"],
    tokenEstimate: 10,
    createdAt: now,
    updatedAt: now,
    metadata: {},
    ...overrides,
  }
}

describe("VectorMemoryStore", () => {
  describe("index", () => {
    it("indexes a source chunk", () => {
      const store = new VectorMemoryStore()
      const record = store.index({
        sourceId: "src_1",
        sourceType: "document",
        workspaceId: ws("ws_1"),
        chunkText: "React hooks allow state management",
        embeddingModel: "text-embedding-ada-002",
        vectorRef: "vec_1",
      })

      expect(record.id).toBeTruthy()
      expect(record.sourceType).toBe("document")
      expect(store.isFresh(record.id)).toBe(true)
    })
  })

  describe("markStale / isFresh", () => {
    it("marks index as stale", () => {
      const store = new VectorMemoryStore()
      const record = store.index({
        sourceId: "src_1",
        sourceType: "file",
        workspaceId: ws("ws_1"),
        chunkText: "content",
        embeddingModel: "model",
        vectorRef: "ref",
      })

      expect(store.isFresh(record.id)).toBe(true)
      store.markStale(record.id)
      expect(store.isFresh(record.id)).toBe(false)
    })
  })

  describe("getForSource", () => {
    it("gets records by source", () => {
      const store = new VectorMemoryStore()
      store.index({ sourceId: "s1", sourceType: "memory", workspaceId: ws("ws_1"), chunkText: "a", embeddingModel: "m", vectorRef: "r" })
      store.index({ sourceId: "s1", sourceType: "memory", workspaceId: ws("ws_1"), chunkText: "b", embeddingModel: "m", vectorRef: "r" })
      store.index({ sourceId: "s2", sourceType: "memory", workspaceId: ws("ws_1"), chunkText: "c", embeddingModel: "m", vectorRef: "r" })

      expect(store.getForSource("s1").length).toBe(2)
    })
  })

  describe("deleteForSource", () => {
    it("deletes all records for a source", () => {
      const store = new VectorMemoryStore()
      store.index({ sourceId: "s1", sourceType: "memory", workspaceId: ws("ws_1"), chunkText: "a", embeddingModel: "m", vectorRef: "r" })
      store.index({ sourceId: "s1", sourceType: "memory", workspaceId: ws("ws_1"), chunkText: "b", embeddingModel: "m", vectorRef: "r" })

      const deleted = store.deleteForSource("s1")
      expect(deleted).toBe(2)
      expect(store.count()).toBe(0)
    })
  })
})

describe("MemorySearchEngine", () => {
  describe("search", () => {
    it("finds records by keyword", () => {
      const engine = new MemorySearchEngine(new VectorMemoryStore())
      engine.indexRecord(mockRecord({ id: "m1", content: "React hooks tutorial" }))
      engine.indexRecord(mockRecord({ id: "m2", content: "Vue composition API" }))

      const results = engine.search({ text: "React hooks", workspaceId: ws("ws_1") })
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.record.id).toBe("m1")
    })

    it("filters by scope", () => {
      const engine = new MemorySearchEngine(new VectorMemoryStore())
      engine.indexRecord(mockRecord({ id: "m1", scope: "worker" }))
      engine.indexRecord(mockRecord({ id: "m2", scope: "session" }))

      const results = engine.search({ text: "test", workspaceId: ws("ws_1"), scope: "worker" })
      expect(results.every(r => r.record.scope === "worker")).toBe(true)
    })

    it("filters by kind", () => {
      const engine = new MemorySearchEngine(new VectorMemoryStore())
      engine.indexRecord(mockRecord({ id: "m1", kind: "stm" }))
      engine.indexRecord(mockRecord({ id: "m2", kind: "ltm" }))

      const results = engine.search({ text: "test", workspaceId: ws("ws_1"), kinds: ["stm"] })
      expect(results.every(r => r.record.kind === "stm")).toBe(true)
    })

    it("filters by workspace", () => {
      const engine = new MemorySearchEngine(new VectorMemoryStore())
      engine.indexRecord(mockRecord({ id: "m1", workspaceId: ws("ws_1") }))
      engine.indexRecord(mockRecord({ id: "m2", workspaceId: ws("ws_2") }))

      const results = engine.search({ text: "test", workspaceId: ws("ws_1") })
      expect(results.every(r => r.record.workspaceId === ws("ws_1"))).toBe(true)
    })

    it("respects maxResults", () => {
      const engine = new MemorySearchEngine(new VectorMemoryStore())
      for (let i = 0; i < 20; i++) {
        engine.indexRecord(mockRecord({ id: `m${i}`, content: `React hooks ${i}` }))
      }

      const results = engine.search({ text: "React hooks", workspaceId: ws("ws_1"), maxResults: 5 })
      expect(results.length).toBeLessThanOrEqual(5)
    })

    it("scores exact matches higher", () => {
      const engine = new MemorySearchEngine(new VectorMemoryStore())
      engine.indexRecord(mockRecord({ id: "m1", content: "React hooks are great" }))
      engine.indexRecord(mockRecord({ id: "m2", content: "Vue has composition" }))

      const results = engine.search({ text: "React hooks are great", workspaceId: ws("ws_1") })
      expect(results[0]!.record.id).toBe("m1")
      expect(results[0]!.matchType).toBe("exact")
    })

    it("returns empty for no matches", () => {
      const engine = new MemorySearchEngine(new VectorMemoryStore())
      engine.indexRecord(mockRecord({ content: "something unrelated" }))

      const results = engine.search({ text: "xyznonexistent", workspaceId: ws("ws_1") })
      expect(results).toEqual([])
    })
  })
})
