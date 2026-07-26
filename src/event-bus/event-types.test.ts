import { describe, it, expect } from "vitest"
import {
  isReplayGrade,
  getEventFamily,
  shouldFlushImmediately,
  parseEulinxUri,
} from "./event-types"

describe("event-types", () => {
  describe("isReplayGrade", () => {
    it("returns true for replay-grade events", () => {
      expect(isReplayGrade("worker.spawned")).toBe(true)
      expect(isReplayGrade("merge.applied")).toBe(true)
      expect(isReplayGrade("permission.granted")).toBe(true)
      expect(isReplayGrade("runtime.started")).toBe(true)
    })

    it("returns false for non-replay-grade events", () => {
      expect(isReplayGrade("worker.output_streamed")).toBe(false)
      expect(isReplayGrade("process.output_streamed")).toBe(false)
      expect(isReplayGrade("execution.progress_reported")).toBe(false)
      expect(isReplayGrade("memory.search_performed")).toBe(false)
      expect(isReplayGrade("ui.view_opened")).toBe(false)
      expect(isReplayGrade("ui.user_action")).toBe(false)
      expect(isReplayGrade("ui.notification_raised")).toBe(false)
    })

    it("returns true for task replay-grade events", () => {
      expect(isReplayGrade("task.created")).toBe(true)
      expect(isReplayGrade("task.state_changed")).toBe(true)
      expect(isReplayGrade("task.assigned")).toBe(true)
      expect(isReplayGrade("task.completed")).toBe(true)
      expect(isReplayGrade("task.failed")).toBe(true)
      expect(isReplayGrade("task.dependency_added")).toBe(true)
      expect(isReplayGrade("task.dependency_met")).toBe(true)
    })

    it("returns false for task non-replay-grade events", () => {
      expect(isReplayGrade("task.progress_updated")).toBe(false)
    })
  })

  describe("getEventFamily", () => {
    it("extracts family from event type", () => {
      expect(getEventFamily("worker.spawned")).toBe("worker")
      expect(getEventFamily("merge.applied")).toBe("merge")
      expect(getEventFamily("runtime.started")).toBe("runtime")
      expect(getEventFamily("execution.completed")).toBe("execution")
      expect(getEventFamily("permission.denied")).toBe("permission")
    })

    it("extracts task family", () => {
      expect(getEventFamily("task.created")).toBe("task")
      expect(getEventFamily("task.state_changed")).toBe("task")
      expect(getEventFamily("task.completed")).toBe("task")
    })

    it("returns undefined for invalid event type", () => {
      expect(getEventFamily("invalid")).toBe(undefined)
      expect(getEventFamily("")).toBe(undefined)
    })
  })

  describe("parseEulinxUri", () => {
    it("parses task URIs", () => {
      const parsed = parseEulinxUri("Eulinx://task/completed")
      expect(parsed).toEqual({ family: "task", fact: "completed" })
    })

    it("parses other family URIs", () => {
      const parsed = parseEulinxUri("Eulinx://worker/spawned")
      expect(parsed).toEqual({ family: "worker", fact: "spawned" })
    })

    it("returns undefined for non-URI strings", () => {
      expect(parseEulinxUri("task.created")).toBeUndefined()
    })
  })

  describe("shouldFlushImmediately", () => {
    it("returns true for merge events", () => {
      expect(shouldFlushImmediately("merge.applied")).toBe(true)
      expect(shouldFlushImmediately("merge.requested")).toBe(true)
    })

    it("returns true for permission events", () => {
      expect(shouldFlushImmediately("permission.granted")).toBe(true)
      expect(shouldFlushImmediately("permission.denied")).toBe(true)
    })

    it("returns true for runtime events", () => {
      expect(shouldFlushImmediately("runtime.started")).toBe(true)
    })

    it("returns true for critical execution/worker events", () => {
      expect(shouldFlushImmediately("execution.completed")).toBe(true)
      expect(shouldFlushImmediately("execution.failed")).toBe(true)
      expect(shouldFlushImmediately("execution.cancelled")).toBe(true)
      expect(shouldFlushImmediately("worker.failed")).toBe(true)
    })

    it("returns false for non-critical events", () => {
      expect(shouldFlushImmediately("worker.spawned")).toBe(false)
      expect(shouldFlushImmediately("worker.output_streamed")).toBe(false)
      expect(shouldFlushImmediately("execution.progress_reported")).toBe(false)
    })

    it("returns false for task events (not in immediate flush list)", () => {
      expect(shouldFlushImmediately("task.created")).toBe(false)
      expect(shouldFlushImmediately("task.completed")).toBe(false)
    })
  })
})
