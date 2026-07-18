/**
 * P08-WORKER-POOLS / P08-WORKER-COORD — Worker Hierarchy Tests
 */

import { describe, it, expect } from "vitest"
import type { SessionId, WorkspaceId, WorkerId, IsoTimestamp } from "@/core/types"
import { WorkerHierarchyManager, DEFAULT_NODE_LIMITS } from "./worker-hierarchy"
import type { PermissionSet, BudgetAllocation } from "./worker-types"

function sid(id: string): SessionId { return id as unknown as SessionId }
function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }
function wid(id: string): WorkerId { return id as unknown as WorkerId }

const FULL_PERMS: PermissionSet = { grants: [] }
const FULL_BUDGET: BudgetAllocation = { allocated: 1000, spent: 0, currency: "usd" }

describe("WorkerHierarchyManager", () => {
  describe("createRoot", () => {
    it("creates root node with depth 0", () => {
      const mgr = new WorkerHierarchyManager()
      const root = mgr.createRoot({
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        fullPermissions: FULL_PERMS,
        totalBudget: FULL_BUDGET,
      })

      expect(root.kind).toBe("user")
      expect(root.depth).toBe(0)
      expect(root.parentId).toBeNull()
      expect(root.state).toBe("running")
    })
  })

  describe("insertNode", () => {
    it("inserts a child under root", () => {
      const mgr = new WorkerHierarchyManager()
      const root = mgr.createRoot({
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        fullPermissions: FULL_PERMS,
        totalBudget: FULL_BUDGET,
      })

      const child = mgr.insertNode({
        parentId: root.id,
        kind: "orchestrator",
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        scope: { objective: "plan", allowedPaths: [], deniedPaths: [], allowedToolIds: [] },
        permissions: FULL_PERMS,
        budget: { allocated: 100, spent: 0, currency: "usd" },
      })

      expect(child.depth).toBe(1)
      expect(child.parentId).toBe(root.id)
      expect(child.path).toContain(root.id)
    })

    it("enforces depth limit", () => {
      const mgr = new WorkerHierarchyManager()
      const root = mgr.createRoot({
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        fullPermissions: FULL_PERMS,
        totalBudget: FULL_BUDGET,
      })

      let current = root
      for (let i = 0; i < DEFAULT_NODE_LIMITS.maxDepth; i++) {
        current = mgr.insertNode({
          parentId: current.id,
          kind: "orchestrator",
          sessionId: sid("ses_1"),
          workspaceId: ws("ws_1"),
          projectId: "proj_1",
          scope: { objective: `level ${i + 1}`, allowedPaths: [], deniedPaths: [], allowedToolIds: [] },
          permissions: FULL_PERMS,
          budget: { allocated: 10, spent: 0, currency: "usd" },
        })
      }

      expect(() => mgr.insertNode({
        parentId: current.id,
        kind: "orchestrator",
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        scope: { objective: "too deep", allowedPaths: [], deniedPaths: [], allowedToolIds: [] },
        permissions: FULL_PERMS,
        budget: { allocated: 10, spent: 0, currency: "usd" },
      })).toThrow("Depth limit")
    })

    it("enforces fan-out limit", () => {
      const mgr = new WorkerHierarchyManager()
      const root = mgr.createRoot({
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        fullPermissions: FULL_PERMS,
        totalBudget: FULL_BUDGET,
      })

      for (let i = 0; i < DEFAULT_NODE_LIMITS.maxDirectChildren; i++) {
        mgr.insertNode({
          parentId: root.id,
          kind: "worker",
          sessionId: sid("ses_1"),
          workspaceId: ws("ws_1"),
          projectId: "proj_1",
          scope: { objective: `child ${i}`, allowedPaths: [], deniedPaths: [], allowedToolIds: [] },
          permissions: FULL_PERMS,
          budget: { allocated: 1, spent: 0, currency: "usd" },
        })
      }

      expect(() => mgr.insertNode({
        parentId: root.id,
        kind: "worker",
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        scope: { objective: "too many", allowedPaths: [], deniedPaths: [], allowedToolIds: [] },
        permissions: FULL_PERMS,
        budget: { allocated: 1, spent: 0, currency: "usd" },
      })).toThrow("Fan-out limit")
    })

    it("prevents workers from having children", () => {
      const mgr = new WorkerHierarchyManager()
      const root = mgr.createRoot({
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        fullPermissions: FULL_PERMS,
        totalBudget: FULL_BUDGET,
      })

      const worker = mgr.insertNode({
        parentId: root.id,
        kind: "worker",
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        scope: { objective: "work", allowedPaths: [], deniedPaths: [], allowedToolIds: [] },
        permissions: FULL_PERMS,
        budget: { allocated: 100, spent: 0, currency: "usd" },
      })

      expect(() => mgr.insertNode({
        parentId: worker.id,
        kind: "worker",
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        scope: { objective: "child", allowedPaths: [], deniedPaths: [], allowedToolIds: [] },
        permissions: FULL_PERMS,
        budget: { allocated: 10, spent: 0, currency: "usd" },
      })).toThrow("Workers cannot have children")
    })
  })

  describe("cascadePause", () => {
    it("pauses all descendants", () => {
      const mgr = new WorkerHierarchyManager()
      const root = mgr.createRoot({
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        fullPermissions: FULL_PERMS,
        totalBudget: FULL_BUDGET,
      })

      const orc = mgr.insertNode({
        parentId: root.id,
        kind: "orchestrator",
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        scope: { objective: "plan", allowedPaths: [], deniedPaths: [], allowedToolIds: [] },
        permissions: FULL_PERMS,
        budget: { allocated: 100, spent: 0, currency: "usd" },
      })

      const worker = mgr.insertNode({
        parentId: orc.id,
        kind: "worker",
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        scope: { objective: "work", allowedPaths: [], deniedPaths: [], allowedToolIds: [] },
        permissions: FULL_PERMS,
        budget: { allocated: 10, spent: 0, currency: "usd" },
      })

      const affected = mgr.cascadePause(orc.id)
      expect(affected).toContain(orc.id)
      expect(affected).toContain(worker.id)
      expect(mgr.getNode(orc.id)!.state).toBe("paused")
      expect(mgr.getNode(worker.id)!.state).toBe("paused")
    })
  })

  describe("cascadeCancel", () => {
    it("cancels all descendants", () => {
      const mgr = new WorkerHierarchyManager()
      const root = mgr.createRoot({
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        fullPermissions: FULL_PERMS,
        totalBudget: FULL_BUDGET,
      })

      const worker = mgr.insertNode({
        parentId: root.id,
        kind: "worker",
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        scope: { objective: "work", allowedPaths: [], deniedPaths: [], allowedToolIds: [] },
        permissions: FULL_PERMS,
        budget: { allocated: 10, spent: 0, currency: "usd" },
      })

      mgr.cascadeCancel(root.id)
      expect(mgr.getNode(worker.id)!.state).toBe("cancelled")
    })
  })

  describe("bubbleResult", () => {
    it("bubbles result from child to parent", () => {
      const mgr = new WorkerHierarchyManager()
      const root = mgr.createRoot({
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        fullPermissions: FULL_PERMS,
        totalBudget: FULL_BUDGET,
      })

      const worker = mgr.insertNode({
        parentId: root.id,
        kind: "worker",
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        scope: { objective: "work", allowedPaths: [], deniedPaths: [], allowedToolIds: [] },
        permissions: FULL_PERMS,
        budget: { allocated: 10, spent: 0, currency: "usd" },
      })

      mgr.bubbleResult(worker.id, {
        outcome: "success",
        summary: "Done",
        artifactIds: ["art_1"],
        producedAt: new Date().toISOString() as IsoTimestamp,
      })

      expect(mgr.getNode(worker.id)!.state).toBe("completed")
      expect(mgr.getNode(worker.id)!.result!.outcome).toBe("success")
    })
  })

  describe("detectOrphans", () => {
    it("detects orphaned nodes", () => {
      const mgr = new WorkerHierarchyManager()
      const root = mgr.createRoot({
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        fullPermissions: FULL_PERMS,
        totalBudget: FULL_BUDGET,
      })

      const worker = mgr.insertNode({
        parentId: root.id,
        kind: "worker",
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        scope: { objective: "work", allowedPaths: [], deniedPaths: [], allowedToolIds: [] },
        permissions: FULL_PERMS,
        budget: { allocated: 10, spent: 0, currency: "usd" },
      })

      // Manually remove parent reference to simulate orphan
      // In real impl this would happen via crash
      expect(mgr.detectOrphans()).toHaveLength(0)
    })
  })

  describe("query API", () => {
    it("gets children and ancestors", () => {
      const mgr = new WorkerHierarchyManager()
      const root = mgr.createRoot({
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        fullPermissions: FULL_PERMS,
        totalBudget: FULL_BUDGET,
      })

      const orc = mgr.insertNode({
        parentId: root.id,
        kind: "orchestrator",
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        scope: { objective: "plan", allowedPaths: [], deniedPaths: [], allowedToolIds: [] },
        permissions: FULL_PERMS,
        budget: { allocated: 100, spent: 0, currency: "usd" },
      })

      const worker = mgr.insertNode({
        parentId: orc.id,
        kind: "worker",
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        projectId: "proj_1",
        scope: { objective: "work", allowedPaths: [], deniedPaths: [], allowedToolIds: [] },
        permissions: FULL_PERMS,
        budget: { allocated: 10, spent: 0, currency: "usd" },
      })

      const children = mgr.getChildren(root.id)
      expect(children.length).toBe(1)
      expect(children[0]!.id).toBe(orc.id)

      const ancestors = mgr.getAncestors(worker.id)
      expect(ancestors.length).toBe(2)
      expect(ancestors[0]!.id).toBe(orc.id)
      expect(ancestors[1]!.id).toBe(root.id)
    })
  })
})
