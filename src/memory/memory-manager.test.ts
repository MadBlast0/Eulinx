/**
 * P09-MEM-MANAGER — Memory Manager Tests
 */

import { describe, it, expect } from "vitest"
import type { WorkspaceId, WorkerId, IsoTimestamp } from "@/core/types"
import { MemoryManager } from "./memory-manager"

function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }
function wid(id: string): WorkerId { return id as unknown as WorkerId }

describe("MemoryManager", () => {
  describe("writeStm", () => {
    it("writes STM and indexes for search", () => {
      const mgr = new MemoryManager({ workspaceId: ws("ws_1") })
      const record = mgr.writeStm({
        content: "React hooks are useful",
        workspaceId: ws("ws_1"),
        workerId: wid("w_1"),
      })

      expect(record.kind).toBe("stm")

      // Should be searchable
      const results = mgr.searchMemory({ text: "React hooks", workspaceId: ws("ws_1") })
      expect(results.length).toBeGreaterThan(0)
    })

    it("auto-redacts secrets", () => {
      const mgr = new MemoryManager({ workspaceId: ws("ws_1") })
      const record = mgr.writeStm({
        content: "api_key=sk_abc123def456ghi789jkl0",
        workspaceId: ws("ws_1"),
        sensitivity: "secret",
      })

      expect(record.content).toContain("[REDACTED]")
    })
  })

  describe("promoteToLtm", () => {
    it("promotes to LTM and indexes", () => {
      const mgr = new MemoryManager({ workspaceId: ws("ws_1") })
      const record = mgr.promoteToLtm({
        content: "Use pnpm for package management",
        workspaceId: ws("ws_1"),
        category: "user_preference",
      })

      expect(record.kind).toBe("ltm")
      expect(record.category).toBe("user_preference")

      const results = mgr.searchMemory({ text: "pnpm package", workspaceId: ws("ws_1") })
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe("recordEpisode", () => {
    it("records an episode", () => {
      const mgr = new MemoryManager({ workspaceId: ws("ws_1") })
      const record = mgr.recordEpisode({
        content: "Build passed",
        workspaceId: ws("ws_1"),
        eventType: "build_success",
        eventTimestamp: new Date().toISOString() as IsoTimestamp,
        participant: "worker_1",
      })

      expect(record.kind).toBe("episodic")
    })
  })

  describe("storeSemanticFact", () => {
    it("stores a semantic fact", () => {
      const mgr = new MemoryManager({ workspaceId: ws("ws_1") })
      const record = mgr.storeSemanticFact({
        content: "Eulinx uses Tauri v2",
        workspaceId: ws("ws_1"),
        factType: "definition",
      })

      expect(record.kind).toBe("semantic")
    })
  })

  describe("searchMemory", () => {
    it("searches across all memory types", () => {
      const mgr = new MemoryManager({ workspaceId: ws("ws_1") })
      mgr.writeStm({ content: "React hooks tutorial", workspaceId: ws("ws_1") })
      mgr.promoteToLtm({ content: "React best practices", workspaceId: ws("ws_1"), category: "fact" })

      const results = mgr.searchMemory({ text: "React", workspaceId: ws("ws_1") })
      expect(results.length).toBe(2)
    })
  })

  describe("buildContext", () => {
    it("builds context within token budget", () => {
      const mgr = new MemoryManager({ workspaceId: ws("ws_1") })
      mgr.writeStm({ content: "React hooks", workspaceId: ws("ws_1") })
      mgr.writeStm({ content: "Vue composition", workspaceId: ws("ws_1") })

      const context = mgr.buildContext({
        workspaceId: ws("ws_1"),
        query: "React",
        maxTokens: 50,
      })

      expect(context.length).toBeGreaterThanOrEqual(1)
      const totalTokens = context.reduce((sum, r) => sum + r.tokenEstimate, 0)
      expect(totalTokens).toBeLessThanOrEqual(50)
    })

    it("excludes secret records", () => {
      const mgr = new MemoryManager({ workspaceId: ws("ws_1") })
      mgr.writeStm({ content: "Normal note", workspaceId: ws("ws_1") })
      mgr.writeStm({ content: "Secret api_key=sk_abc123def456ghi789jkl0", workspaceId: ws("ws_1"), sensitivity: "secret" })

      const context = mgr.buildContext({
        workspaceId: ws("ws_1"),
        query: "api key secret",
      })

      // Should not include the secret record
      expect(context.every(r => !r.content.includes("sk_abc123"))).toBe(true)
    })
  })

  describe("clearWorkerStm", () => {
    it("clears STM for a specific worker", () => {
      const mgr = new MemoryManager({ workspaceId: ws("ws_1") })
      mgr.writeStm({ content: "A", workspaceId: ws("ws_1"), workerId: wid("w_1") })
      mgr.writeStm({ content: "B", workspaceId: ws("ws_1"), workerId: wid("w_2") })

      const cleared = mgr.clearWorkerStm(wid("w_1"))
      expect(cleared).toBe(1)
    })
  })

  describe("getMetrics", () => {
    it("returns memory metrics", () => {
      const mgr = new MemoryManager({ workspaceId: ws("ws_1") })
      mgr.writeStm({ content: "A", workspaceId: ws("ws_1") })
      mgr.promoteToLtm({ content: "B", workspaceId: ws("ws_1"), category: "fact" })

      const metrics = mgr.getMetrics(ws("ws_1"))
      expect(metrics.totalRecords).toBe(2)
      expect(metrics.recordsByKind.stm).toBe(1)
      expect(metrics.recordsByKind.ltm).toBe(1)
    })
  })

  describe("prune", () => {
    it("prunes expired STM", () => {
      const mgr = new MemoryManager({ workspaceId: ws("ws_1") })
      mgr.writeStm({ content: "OK", workspaceId: ws("ws_1"), ttlMs: 60_000 })
      mgr.writeStm({ content: "Expired", workspaceId: ws("ws_1"), ttlMs: -1 })

      const result = mgr.prune()
      expect(result.stm).toBe(1)
    })
  })
})
