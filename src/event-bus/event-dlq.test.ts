/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest"
import { DeadLetterQueue } from "./event-dlq"
import type { EulinxEventUnion, SubscriptionId } from "./event-types"
import type { WorkspaceId } from "@/core/types"

function createTestEvent(type: string): EulinxEventUnion {
  return {
    eventId: "evt_1",
    sequence: 1,
    type,
    payload: {},
    source: { service: "RuntimeManager" },
    workspaceId: "ws_test" as WorkspaceId,
    replayGrade: true,
    emittedAt: new Date().toISOString(),
  } as EulinxEventUnion
}

describe("DeadLetterQueue", () => {
  it("adds entries", () => {
    const dlq = new DeadLetterQueue(10)
    dlq.add({
      event: createTestEvent("worker.failed"),
      subscriptionId: "sub_1" as SubscriptionId,
      subscriberKind: "core",
      failureReason: "handler error",
      attemptCount: 1,
    })

    expect(dlq.length).toBe(1)
  })

  it("evicts oldest when at capacity", () => {
    const dlq = new DeadLetterQueue(2)
    dlq.add({
      event: createTestEvent("worker.failed"),
      subscriptionId: "sub_1" as SubscriptionId,
      subscriberKind: "core",
      failureReason: "error 1",
      attemptCount: 1,
    })
    dlq.add({
      event: createTestEvent("worker.failed"),
      subscriptionId: "sub_1" as SubscriptionId,
      subscriberKind: "core",
      failureReason: "error 2",
      attemptCount: 2,
    })
    dlq.add({
      event: createTestEvent("worker.failed"),
      subscriptionId: "sub_1" as SubscriptionId,
      subscriberKind: "core",
      failureReason: "error 3",
      attemptCount: 3,
    })

    expect(dlq.length).toBe(2)
    const entries = dlq.entries()
    expect(entries[0]!.failureReason).toBe("error 2")
    expect(entries[1]!.failureReason).toBe("error 3")
  })

  it("filters by subscription", () => {
    const dlq = new DeadLetterQueue(10)
    dlq.add({
      event: createTestEvent("a"),
      subscriptionId: "sub_1" as SubscriptionId,
      subscriberKind: "core",
      failureReason: "error",
      attemptCount: 1,
    })
    dlq.add({
      event: createTestEvent("b"),
      subscriptionId: "sub_2" as SubscriptionId,
      subscriberKind: "plugin",
      failureReason: "error",
      attemptCount: 1,
    })

    expect(dlq.entries({ subscriptionId: "sub_1" as SubscriptionId }).length).toBe(1)
    expect(dlq.entries({ subscriptionId: "sub_2" as SubscriptionId }).length).toBe(1)
  })

  it("filters by event type", () => {
    const dlq = new DeadLetterQueue(10)
    dlq.add({
      event: createTestEvent("worker.failed"),
      subscriptionId: "sub_1" as SubscriptionId,
      subscriberKind: "core",
      failureReason: "error",
      attemptCount: 1,
    })
    dlq.add({
      event: createTestEvent("merge.applied"),
      subscriptionId: "sub_1" as SubscriptionId,
      subscriberKind: "core",
      failureReason: "error",
      attemptCount: 1,
    })

    expect(dlq.entriesByType("worker.failed").length).toBe(1)
    expect(dlq.entriesByType("merge.applied").length).toBe(1)
  })

  it("clears all entries", () => {
    const dlq = new DeadLetterQueue(10)
    dlq.add({
      event: createTestEvent("a"),
      subscriptionId: "sub_1" as SubscriptionId,
      subscriberKind: "core",
      failureReason: "error",
      attemptCount: 1,
    })
    dlq.clear()
    expect(dlq.length).toBe(0)
  })

  it("removes by subscription", () => {
    const dlq = new DeadLetterQueue(10)
    dlq.add({
      event: createTestEvent("a"),
      subscriptionId: "sub_1" as SubscriptionId,
      subscriberKind: "core",
      failureReason: "error",
      attemptCount: 1,
    })
    dlq.add({
      event: createTestEvent("b"),
      subscriptionId: "sub_2" as SubscriptionId,
      subscriberKind: "plugin",
      failureReason: "error",
      attemptCount: 1,
    })

    const removed = dlq.removeBySubscription("sub_1" as SubscriptionId)
    expect(removed).toBe(1)
    expect(dlq.length).toBe(1)
  })
})
