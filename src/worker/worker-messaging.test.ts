/**
 * P08-WORKER-MSG — Worker Messaging Tests
 */

import { describe, it, expect } from "vitest"
import type { SessionId, WorkspaceId, IsoTimestamp } from "@/core/types"
import type { HierarchyNodeId } from "./worker-types"
import { WorkerMessageRouter } from "./worker-messaging"

function sid(id: string): SessionId { return id as unknown as SessionId }
function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }
function hnid(id: string): HierarchyNodeId { return id }

function makeEnvelope(overrides?: Record<string, unknown>) {
  return WorkerMessageRouter.buildEnvelope({
    kind: "status",
    sessionId: sid("ses_1"),
    workspaceId: ws("ws_1"),
    fromNodeId: hnid("child"),
    toNodeId: hnid("parent"),
    direction: "up",
    payload: { status: "working" },
    ...overrides,
  })
}

const mockHierarchy = {
  areParentChild: (a: HierarchyNodeId, b: HierarchyNodeId) =>
    (a === "parent" && b === "child") || (a === "child" && b === "parent"),
  getNodeState: (_id: HierarchyNodeId) => "running",
}

describe("WorkerMessageRouter", () => {
  describe("sendMessage", () => {
    it("validates parent-child relationship", () => {
      const router = new WorkerMessageRouter()
      const envelope = makeEnvelope({
        fromNodeId: hnid("stranger"),
        toNodeId: hnid("other_stranger"),
      })

      const result = router.sendMessage(envelope, mockHierarchy)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain("not parent-child")
    })

    it("rejects delivery to terminal state", () => {
      const router = new WorkerMessageRouter()
      const terminalHierarchy = {
        ...mockHierarchy,
        getNodeState: () => "completed",
      }

      const envelope = makeEnvelope()
      const result = router.sendMessage(envelope, terminalHierarchy)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain("terminal state")
    })

    it("delivers valid message", () => {
      const router = new WorkerMessageRouter()
      const envelope = makeEnvelope()

      const result = router.sendMessage(envelope, mockHierarchy)
      expect(result.valid).toBe(true)
      expect(router.getDelivered().length).toBe(1)
    })

    it("sequences messages per channel", () => {
      const router = new WorkerMessageRouter()

      router.sendMessage(makeEnvelope(), mockHierarchy)
      router.sendMessage(makeEnvelope(), mockHierarchy)
      router.sendMessage(makeEnvelope(), mockHierarchy)

      const delivered = router.getDelivered()
      expect(delivered[0]!.sequence).toBe(1)
      expect(delivered[1]!.sequence).toBe(2)
      expect(delivered[2]!.sequence).toBe(3)
    })

    it("control priority jumps the queue", () => {
      const router = new WorkerMessageRouter()

      router.sendMessage(makeEnvelope({ priority: "normal" }), mockHierarchy)
      router.sendMessage(makeEnvelope({ priority: "normal" }), mockHierarchy)
      router.sendMessage(makeEnvelope({ priority: "control", kind: "cancel" }), mockHierarchy)

      const delivered = router.getDelivered()
      expect(delivered[2]!.kind).toBe("cancel")
      expect(delivered[2]!.priority).toBe("control")
    })
  })

  describe("buildEnvelope", () => {
    it("builds a valid envelope", () => {
      const envelope = WorkerMessageRouter.buildEnvelope({
        kind: "task_assignment",
        sessionId: sid("ses_1"),
        workspaceId: ws("ws_1"),
        fromNodeId: hnid("parent"),
        toNodeId: hnid("child"),
        direction: "down",
        payload: { taskId: "t_1", objective: "do stuff" },
      })

      expect(envelope.messageId).toBeTruthy()
      expect(envelope.kind).toBe("task_assignment")
      expect(envelope.direction).toBe("down")
      expect(envelope.correlationId).toBeNull()
    })
  })

  describe("event subscription", () => {
    it("notifies on delivered messages", () => {
      const router = new WorkerMessageRouter()
      const delivered: string[] = []
      router.onMessage(e => delivered.push(e.kind))

      router.sendMessage(makeEnvelope({ kind: "heartbeat" }), mockHierarchy)
      router.sendMessage(makeEnvelope({ kind: "status" }), mockHierarchy)

      expect(delivered).toEqual(["heartbeat", "status"])
    })
  })
})
