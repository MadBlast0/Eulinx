import { describe, it, expect } from "vitest"
import {
  isReplayGrade,
  getEventFamily,
  shouldFlushImmediately,
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
  })

  describe("getEventFamily", () => {
    it("extracts family from event type", () => {
      expect(getEventFamily("worker.spawned")).toBe("worker")
      expect(getEventFamily("merge.applied")).toBe("merge")
      expect(getEventFamily("runtime.started")).toBe("runtime")
      expect(getEventFamily("execution.completed")).toBe("execution")
      expect(getEventFamily("permission.denied")).toBe("permission")
    })

    it("returns undefined for invalid event type", () => {
      expect(getEventFamily("invalid")).toBe(undefined)
      expect(getEventFamily("")).toBe(undefined)
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
  })
})
