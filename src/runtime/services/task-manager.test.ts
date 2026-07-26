import { describe, it, expect, beforeEach } from "vitest"
import { TaskManager } from "./task-manager"
import { EventBus } from "@/event-bus/event-bus"
import type { EulinxEventUnion } from "@/event-bus/event-types"

function createEventBus(): EventBus {
  return new EventBus()
}

describe("TaskManager", () => {
  let eventBus: EventBus
  let taskManager: TaskManager

  beforeEach(() => {
    eventBus = createEventBus()
    eventBus.start()
    taskManager = new TaskManager(eventBus)
  })

  describe("lifecycle", () => {
    it("starts in registered state", () => {
      expect(taskManager.getState()).toBe("registered")
    })

    it("transitions to running on start", async () => {
      await taskManager.start()
      expect(taskManager.getState()).toBe("running")
    })

    it("transitions to stopped on stop", async () => {
      await taskManager.start()
      await taskManager.stop()
      expect(taskManager.getState()).toBe("stopped")
    })
  })

  describe("event publishing", () => {
    it("taskCreated publishes correct event", async () => {
      await taskManager.start()
      const received: EulinxEventUnion[] = []
      eventBus.subscribe("core", "test", { topics: ["task.created"] }, async (event) => {
        received.push(event)
      })

      await taskManager.taskCreated("task-1", "Test Task", "high", ["task-0"])

      expect(received).toHaveLength(1)
      expect(received[0].type).toBe("task.created")
      expect((received[0].payload as Record<string, unknown>).taskId).toBe("task-1")
      expect((received[0].payload as Record<string, unknown>).title).toBe("Test Task")
      expect((received[0].payload as Record<string, unknown>).priority).toBe("high")
      expect((received[0].payload as Record<string, unknown>).dependencies).toEqual(["task-0"])
    })

    it("taskStateChanged publishes correct event", async () => {
      await taskManager.start()
      const received: EulinxEventUnion[] = []
      eventBus.subscribe("core", "test", { topics: ["task.state_changed"] }, async (event) => {
        received.push(event)
      })

      await taskManager.taskStateChanged("task-1", "backlog", "in_progress", "Starting work", "user-1")

      expect(received).toHaveLength(1)
      expect(received[0].type).toBe("task.state_changed")
      const payload = received[0].payload as Record<string, unknown>
      expect(payload.taskId).toBe("task-1")
      expect(payload.from).toBe("backlog")
      expect(payload.to).toBe("in_progress")
      expect(payload.reason).toBe("Starting work")
      expect(payload.actor).toBe("user-1")
    })

    it("taskAssigned publishes correct event", async () => {
      await taskManager.start()
      const received: EulinxEventUnion[] = []
      eventBus.subscribe("core", "test", { topics: ["task.assigned"] }, async (event) => {
        received.push(event)
      })

      await taskManager.taskAssigned("task-1", "worker-1", "worker-0")

      expect(received).toHaveLength(1)
      expect(received[0].type).toBe("task.assigned")
      const payload = received[0].payload as Record<string, unknown>
      expect(payload.taskId).toBe("task-1")
      expect(payload.workerId).toBe("worker-1")
      expect(payload.previousWorkerId).toBe("worker-0")
    })

    it("taskProgressUpdated publishes correct event", async () => {
      await taskManager.start()
      const received: EulinxEventUnion[] = []
      eventBus.subscribe("core", "test", { topics: ["task.progress_updated"] }, async (event) => {
        received.push(event)
      })

      await taskManager.taskProgressUpdated("task-1", 75, "Implementing auth")

      expect(received).toHaveLength(1)
      expect(received[0].type).toBe("task.progress_updated")
      const payload = received[0].payload as Record<string, unknown>
      expect(payload.taskId).toBe("task-1")
      expect(payload.percentage).toBe(75)
      expect(payload.currentStep).toBe("Implementing auth")
    })

    it("taskCompleted publishes correct event", async () => {
      await taskManager.start()
      const received: EulinxEventUnion[] = []
      eventBus.subscribe("core", "test", { topics: ["task.completed"] }, async (event) => {
        received.push(event)
      })

      await taskManager.taskCompleted("task-1", ["auth.ts", "auth.test.ts"], true, 5000)

      expect(received).toHaveLength(1)
      expect(received[0].type).toBe("task.completed")
      const payload = received[0].payload as Record<string, unknown>
      expect(payload.taskId).toBe("task-1")
      expect(payload.artifactIds).toEqual(["auth.ts", "auth.test.ts"])
      expect(payload.verificationPassed).toBe(true)
      expect(payload.durationMs).toBe(5000)
    })

    it("taskFailed publishes correct event", async () => {
      await taskManager.start()
      const received: EulinxEventUnion[] = []
      eventBus.subscribe("core", "test", { topics: ["task.failed"] }, async (event) => {
        received.push(event)
      })

      await taskManager.taskFailed("task-1", "Type error in auth.ts", true)

      expect(received).toHaveLength(1)
      expect(received[0].type).toBe("task.failed")
      const payload = received[0].payload as Record<string, unknown>
      expect(payload.taskId).toBe("task-1")
      expect(payload.error).toBe("Type error in auth.ts")
      expect(payload.willRetry).toBe(true)
    })
  })
})
