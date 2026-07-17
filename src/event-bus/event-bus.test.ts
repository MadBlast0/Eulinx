/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach } from "vitest"
import { EventBus } from "./event-bus"
import { DEFAULT_EVENT_BUS_CONFIG } from "./event-bus-config"
import type { EulinxEventUnion } from "./event-types"
import type { WorkspaceId } from "@/core/types"

function createTestEvent(
  type: string,
  workspaceId: WorkspaceId = "ws_test" as WorkspaceId,
): EulinxEventUnion {
  return {
    eventId: `evt_${Date.now()}_${Math.random()}`,
    sequence: 0,
    type,
    payload: {},
    source: { service: "RuntimeManager" },
    workspaceId,
    replayGrade: true,
    emittedAt: new Date().toISOString(),
  } as EulinxEventUnion
}

describe("EventBus", () => {
  let bus: EventBus

  beforeEach(() => {
    bus = new EventBus()
    bus.start()
  })

  describe("lifecycle", () => {
    it("starts in uninitialized state", () => {
      const freshBus = new EventBus()
      expect(freshBus.getState()).toBe("uninitialized")
    })

    it("transitions to running after start", () => {
      expect(bus.getState()).toBe("running")
    })

    it("can drain gracefully", async () => {
      await bus.drain()
      expect(bus.getState()).toBe("stopped")
    })

    it("can force stop", () => {
      bus.forceStop()
      expect(bus.getState()).toBe("stopped")
    })
  })

  describe("publish", () => {
    it("rejects publish when not running", async () => {
      bus.forceStop()
      const event = createTestEvent("worker.spawned")
      const result = await bus.publish(event)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe("bus_not_running")
      }
    })

    it("publishes and assigns sequence", async () => {
      const event = createTestEvent("worker.spawned")
      const result = await bus.publish(event)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.sequence).toBe(1)
        expect(result.eventId).toBeDefined()
      }
    })

    it("assigns monotonic sequences", async () => {
      const r1 = await bus.publish(createTestEvent("worker.spawned"))
      const r2 = await bus.publish(createTestEvent("worker.ready"))
      const r3 = await bus.publish(createTestEvent("worker.completed"))

      expect(r1.ok && r1.sequence).toBe(1)
      expect(r2.ok && r2.sequence).toBe(2)
      expect(r3.ok && r3.sequence).toBe(3)
    })

    it("rejects payload too large", async () => {
      const largePayload = "x".repeat(DEFAULT_EVENT_BUS_CONFIG.maxPayloadBytes + 1)
      const event = {
        ...createTestEvent("worker.spawned"),
        payload: { data: largePayload },
      } as unknown as EulinxEventUnion
      const result = await bus.publish(event)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe("payload_too_large")
      }
    })

    it("increments published metric", async () => {
      await bus.publish(createTestEvent("worker.spawned"))
      await bus.publish(createTestEvent("worker.ready"))

      expect(bus.getMetrics().published).toBe(2)
    })
  })

  describe("subscribe", () => {
    it("subscribes and receives events", async () => {
      const received: EulinxEventUnion[] = []
      bus.subscribe("core", "test", { topics: ["worker.*"] }, async (event) => {
        received.push(event)
      })

      await bus.publish(createTestEvent("worker.spawned"))
      await bus.publish(createTestEvent("merge.applied"))

      expect(received.length).toBe(1)
      expect(received[0]!.type).toBe("worker.spawned")
    })

    it("rejects empty topics", () => {
      const result = bus.subscribe("core", "test", { topics: [] }, async () => {})
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe("empty_topics")
      }
    })

    it("rejects wildcard for plugin subscribers", () => {
      const result = bus.subscribe(
        "plugin",
        "test_plugin",
        { topics: ["*"], workspaceId: "ws_1" as WorkspaceId },
        async () => {},
      )
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe("wildcard_not_permitted")
      }
    })

    it("rejects plugin without workspace scope", () => {
      const result = bus.subscribe("plugin", "test_plugin", { topics: ["worker.*"] }, async () => {})
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe("workspace_scope_required")
      }
    })

    it("limits plugin subscriptions to 32 per plugin", () => {
      for (let i = 0; i < 32; i++) {
        bus.subscribe(
          "plugin",
          "test_plugin",
          { topics: [`event_${i}`], workspaceId: "ws_1" as WorkspaceId },
          async () => {},
        )
      }

      const result = bus.subscribe(
        "plugin",
        "test_plugin",
        { topics: ["overflow"], workspaceId: "ws_1" as WorkspaceId },
        async () => {},
      )
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe("subscription_limit_reached")
      }
    })

    it("unsubscribe removes subscription", async () => {
      const received: EulinxEventUnion[] = []
      const result = bus.subscribe("core", "test", { topics: ["worker.*"] }, async (event) => {
        received.push(event)
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        bus.unsubscribe(result.subscriptionId)
      }

      await bus.publish(createTestEvent("worker.spawned"))
      expect(received.length).toBe(0)
    })
  })

  describe("topic matching", () => {
    it("exact match", async () => {
      const received: EulinxEventUnion[] = []
      bus.subscribe("core", "test", { topics: ["worker.spawned"] }, async (event) => {
        received.push(event)
      })

      await bus.publish(createTestEvent("worker.spawned"))
      await bus.publish(createTestEvent("worker.ready"))

      expect(received.length).toBe(1)
      expect(received[0]!.type).toBe("worker.spawned")
    })

    it("family wildcard", async () => {
      const received: EulinxEventUnion[] = []
      bus.subscribe("core", "test", { topics: ["worker.*"] }, async (event) => {
        received.push(event)
      })

      await bus.publish(createTestEvent("worker.spawned"))
      await bus.publish(createTestEvent("worker.ready"))
      await bus.publish(createTestEvent("worker.completed"))
      await bus.publish(createTestEvent("merge.applied"))

      expect(received.length).toBe(3)
    })

    it("full wildcard for core subscribers", async () => {
      const received: EulinxEventUnion[] = []
      bus.subscribe("core", "test", { topics: ["*"] }, async (event) => {
        received.push(event)
      })

      await bus.publish(createTestEvent("worker.spawned"))
      await bus.publish(createTestEvent("merge.applied"))

      expect(received.length).toBe(2)
    })

    it("workspace scope filtering", async () => {
      const received: EulinxEventUnion[] = []
      bus.subscribe("core", "test", { topics: ["worker.*"], workspaceId: "ws_target" as WorkspaceId }, async (event) => {
        received.push(event)
      })

      await bus.publish(createTestEvent("worker.spawned", "ws_target" as WorkspaceId))
      await bus.publish(createTestEvent("worker.spawned", "ws_other" as WorkspaceId))

      expect(received.length).toBe(1)
    })
  })

  describe("middleware", () => {
    it("processes events through middleware", async () => {
      const order: string[] = []

      bus.addMiddleware({
        name: "tracker",
        priority: 0,
        process: (event, next) => {
          order.push(event.type)
          return next(event)
        },
      })

      await bus.publish(createTestEvent("worker.spawned"))
      expect(order).toEqual(["worker.spawned"])
    })

    it("middleware can drop events", async () => {
      const received: EulinxEventUnion[] = []
      bus.subscribe("core", "test", { topics: ["worker.*"] }, async (event) => {
        received.push(event)
      })

      bus.addMiddleware({
        name: "dropper",
        priority: 0,
        process: () => null,
      })

      await bus.publish(createTestEvent("worker.spawned"))
      expect(received.length).toBe(0)
    })
  })

  describe("multiple subscribers", () => {
    it("delivers to multiple matching subscribers", async () => {
      const received1: EulinxEventUnion[] = []
      const received2: EulinxEventUnion[] = []

      bus.subscribe("core", "sub1", { topics: ["worker.*"] }, async (event) => {
        received1.push(event)
      })
      bus.subscribe("core", "sub2", { topics: ["worker.*"] }, async (event) => {
        received2.push(event)
      })

      await bus.publish(createTestEvent("worker.spawned"))

      expect(received1.length).toBe(1)
      expect(received2.length).toBe(1)
    })

    it("different subscribers receive different events", async () => {
      const workerEvents: EulinxEventUnion[] = []
      const mergeEvents: EulinxEventUnion[] = []

      bus.subscribe("core", "worker_sub", { topics: ["worker.*"] }, async (event) => {
        workerEvents.push(event)
      })
      bus.subscribe("core", "merge_sub", { topics: ["merge.*"] }, async (event) => {
        mergeEvents.push(event)
      })

      await bus.publish(createTestEvent("worker.spawned"))
      await bus.publish(createTestEvent("merge.applied"))
      await bus.publish(createTestEvent("worker.ready"))

      expect(workerEvents.length).toBe(2)
      expect(mergeEvents.length).toBe(1)
    })
  })
})
