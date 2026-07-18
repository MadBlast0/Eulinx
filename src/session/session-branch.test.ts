/**
 * P07-SESSION-BRANCH — Session Branch Tests
 */

import { describe, it, expect } from "vitest"
import type { SessionId } from "@/core/types"
import { SessionBranchManager } from "./session-branch"

function sid(id: string): SessionId { return id as unknown as SessionId }

describe("SessionBranchManager", () => {
  describe("createBranch", () => {
    it("creates a branch from a source session", () => {
      const mgr = new SessionBranchManager()

      const branch = mgr.createBranch({
        sourceSessionId: sid("ses_1"),
        forkAtEventSeq: 10,
        reason: "Try alternative approach",
        kind: "chat",
      })

      expect(branch.branchId).toBeTruthy()
      expect(branch.sourceSessionId).toBe("ses_1")
      expect(branch.targetSessionId).toBeTruthy()
      expect(branch.forkedAtEventSeq).toBe(10)
      expect(branch.reason).toBe("Try alternative approach")
    })
  })

  describe("getBranch / getSourceBranches", () => {
    it("retrieves branches", () => {
      const mgr = new SessionBranchManager()

      mgr.createBranch({ sourceSessionId: sid("ses_1"), forkAtEventSeq: 5, reason: "Branch A", kind: "chat" })
      mgr.createBranch({ sourceSessionId: sid("ses_1"), forkAtEventSeq: 8, reason: "Branch B", kind: "chat" })
      mgr.createBranch({ sourceSessionId: sid("ses_2"), forkAtEventSeq: 3, reason: "Branch C", kind: "chat" })

      const ses1Branches = mgr.getSourceBranches(sid("ses_1"))
      expect(ses1Branches.length).toBe(2)

      const ses2Branches = mgr.getSourceBranches(sid("ses_2"))
      expect(ses2Branches.length).toBe(1)
    })
  })

  describe("buildBranchCreateRequest", () => {
    it("builds a create request from a branch", () => {
      const mgr = new SessionBranchManager()
      const branch = mgr.createBranch({
        sourceSessionId: sid("ses_1"),
        forkAtEventSeq: 10,
        reason: "Test",
        kind: "terminal",
      })

      const request = mgr.buildBranchCreateRequest(branch, "rt_1", "terminal")
      expect(request.runtimeId).toBe("rt_1")
      expect(request.kind).toBe("terminal")
      expect(request.parentSessionId).toBe("ses_1")
      expect(request.branchFromEventSeq).toBe(10)
    })
  })

  describe("deleteBranch", () => {
    it("deletes a branch", () => {
      const mgr = new SessionBranchManager()
      const branch = mgr.createBranch({
        sourceSessionId: sid("ses_1"),
        forkAtEventSeq: 5,
        reason: "Delete me",
        kind: "chat",
      })

      expect(mgr.getBranchCount()).toBe(1)
      mgr.deleteBranch(branch.branchId)
      expect(mgr.getBranchCount()).toBe(0)
    })
  })

  describe("getBranchCount", () => {
    it("counts all or per-source branches", () => {
      const mgr = new SessionBranchManager()

      mgr.createBranch({ sourceSessionId: sid("ses_1"), forkAtEventSeq: 1, reason: "A", kind: "chat" })
      mgr.createBranch({ sourceSessionId: sid("ses_1"), forkAtEventSeq: 2, reason: "B", kind: "chat" })
      mgr.createBranch({ sourceSessionId: sid("ses_2"), forkAtEventSeq: 1, reason: "C", kind: "chat" })

      expect(mgr.getBranchCount()).toBe(3)
      expect(mgr.getBranchCount(sid("ses_1"))).toBe(2)
      expect(mgr.getBranchCount(sid("ses_2"))).toBe(1)
    })
  })
})
