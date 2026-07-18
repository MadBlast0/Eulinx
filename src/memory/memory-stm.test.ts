/**
 * P09-MEM-STM / P09-MEM-WORKING — STM & Working Memory Tests
 */

import { describe, it, expect } from "vitest"
import type { WorkspaceId, WorkerId, SessionId } from "@/core/types"
import { ShortTermMemoryStore, WorkingMemoryStore } from "./memory-stm"
import { DEFAULT_MEMORY_POLICY } from "./memory-policies"
import type { MemoryPolicy } from "./memory-types"

function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }
function wid(id: string): WorkerId { return id as unknown as WorkerId }
function sid(id: string): SessionId { return id as unknown as SessionId }

const testPolicy: MemoryPolicy = {
  ...DEFAULT_MEMORY_POLICY,
  workspaceId: ws("ws_1"),
  maxStmPerWorker: 5,
  stmTtlMs: 60_000,
}

describe("ShortTermMemoryStore", () => {
  describe("write / read", () => {
    it("writes and reads a record", () => {
      const store = new ShortTermMemoryStore(testPolicy)
      const record = store.write({
        content: "Test note",
        workspaceId: ws("ws_1"),
        workerId: wid("w_1"),
        expiryMode: "worker_end",
      })

      expect(record.id).toBeTruthy()
      expect(record.content).toBe("Test note")
      expect(record.kind).toBe("stm")

      const read = store.read(record.id)
      expect(read).toBeDefined()
      expect(read!.content).toBe("Test note")
    })

    it("returns undefined for expired records", () => {
      const store = new ShortTermMemoryStore(testPolicy)
      const record = store.write({
        content: "Expiring",
        workspaceId: ws("ws_1"),
        workerId: wid("w_1"),
        expiryMode: "time_to_live",
        ttlMs: -1, // already expired
      })

      expect(store.read(record.id)).toBeUndefined()
    })
  })

  describe("clearByMode", () => {
    it("clears records by expiry mode", () => {
      const store = new ShortTermMemoryStore(testPolicy)
      store.write({ content: "A", workspaceId: ws("ws_1"), workerId: wid("w_1"), expiryMode: "worker_end" })
      store.write({ content: "B", workspaceId: ws("ws_1"), workerId: wid("w_1"), expiryMode: "session_end" })
      store.write({ content: "C", workspaceId: ws("ws_1"), workerId: wid("w_1"), expiryMode: "worker_end" })

      const cleared = store.clearByMode("worker_end")
      expect(cleared).toBe(2)
      expect(store.count()).toBe(1)
    })
  })

  describe("capacity", () => {
    it("evicts oldest when at capacity", () => {
      const store = new ShortTermMemoryStore(testPolicy)
      for (let i = 0; i < 6; i++) {
        store.write({ content: `Note ${i}`, workspaceId: ws("ws_1"), workerId: wid("w_1"), expiryMode: "worker_end" })
      }
      // Should have at most maxStmPerWorker (5)
      expect(store.count()).toBeLessThanOrEqual(5)
    })
  })

  describe("pruneExpired", () => {
    it("prunes expired records", () => {
      const store = new ShortTermMemoryStore(testPolicy)
      store.write({ content: "OK", workspaceId: ws("ws_1"), workerId: wid("w_1"), expiryMode: "worker_end", ttlMs: 60_000 })
      store.write({ content: "Expired", workspaceId: ws("ws_1"), workerId: wid("w_1"), expiryMode: "time_to_live", ttlMs: -1 })

      const pruned = store.pruneExpired()
      expect(pruned).toBe(1)
      expect(store.count()).toBe(1)
    })
  })
})

describe("WorkingMemoryStore", () => {
  describe("set / get", () => {
    it("sets and gets a slot", () => {
      const store = new WorkingMemoryStore()
      const record = store.set({
        slot: "current_plan",
        content: "Step 1: Build feature X",
        workspaceId: ws("ws_1"),
        workerId: wid("w_1"),
      })

      expect(record.slot).toBe("current_plan")
      expect(store.get("current_plan")).toBeDefined()
    })

    it("overwrites existing slot", () => {
      const store = new WorkingMemoryStore()
      store.set({ slot: "plan", content: "Old", workspaceId: ws("ws_1") })
      store.set({ slot: "plan", content: "New", workspaceId: ws("ws_1") })

      expect(store.get("plan")!.content).toBe("New")
    })
  })

  describe("clearWorker", () => {
    it("clears all slots for a worker", () => {
      const store = new WorkingMemoryStore()
      store.set({ slot: "a", content: "A", workspaceId: ws("ws_1"), workerId: wid("w_1") })
      store.set({ slot: "b", content: "B", workspaceId: ws("ws_1"), workerId: wid("w_2") })

      store.clearWorker(wid("w_1"))
      expect(store.count()).toBe(1)
    })
  })
})
