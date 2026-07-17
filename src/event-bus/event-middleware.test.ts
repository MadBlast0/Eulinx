import { describe, it, expect, vi } from "vitest"
import {
  MiddlewarePipeline,
  createLoggingMiddleware,
  createReplayGradeFilter,
  createWorkspaceScopeFilter,
} from "./event-middleware"
import type { EulinxEventUnion } from "./event-types"
import type { WorkspaceId } from "@/core/types"

function createTestEvent(type: string, replayGrade = true, workspaceId = "ws_1"): EulinxEventUnion {
  return {
    eventId: "evt_1",
    sequence: 1,
    type,
    payload: {},
    source: { service: "RuntimeManager" },
    workspaceId: workspaceId as WorkspaceId,
    replayGrade,
    emittedAt: new Date().toISOString(),
  } as EulinxEventUnion
}

describe("MiddlewarePipeline", () => {
  it("passes event through when no middleware", () => {
    const pipeline = new MiddlewarePipeline()
    const event = createTestEvent("worker.spawned")
    expect(pipeline.process(event)).toBe(event)
  })

  it("executes middleware in priority order", () => {
    const pipeline = new MiddlewarePipeline()
    const order: string[] = []

    pipeline.add({
      name: "b",
      priority: 2,
      process: (event, next) => {
        order.push("b")
        return next(event)
      },
    })

    pipeline.add({
      name: "a",
      priority: 1,
      process: (event, next) => {
        order.push("a")
        return next(event)
      },
    })

    pipeline.process(createTestEvent("worker.spawned"))
    expect(order).toEqual(["a", "b"])
  })

  it("middleware can drop events", () => {
    const pipeline = new MiddlewarePipeline()

    pipeline.add({
      name: "dropper",
      priority: 0,
      process: () => null,
    })

    const result = pipeline.process(createTestEvent("worker.spawned"))
    expect(result).toBeNull()
  })

  it("middleware can transform events", () => {
    const pipeline = new MiddlewarePipeline()

    pipeline.add({
      name: "tagger",
      priority: 0,
      process: (event, next) => {
        return next({ ...event, correlationId: "added_by_middleware" })
      },
    })

    const result = pipeline.process(createTestEvent("worker.spawned"))
    expect(result?.correlationId).toBe("added_by_middleware")
  })

  it("remove removes middleware by name", () => {
    const pipeline = new MiddlewarePipeline()
    pipeline.add({ name: "test", priority: 0, process: (e, next) => next(e) })
    expect(pipeline.size).toBe(1)

    pipeline.remove("test")
    expect(pipeline.size).toBe(0)
  })

  it("clear removes all middleware", () => {
    const pipeline = new MiddlewarePipeline()
    pipeline.add({ name: "a", priority: 0, process: (e, next) => next(e) })
    pipeline.add({ name: "b", priority: 1, process: (e, next) => next(e) })
    pipeline.clear()
    expect(pipeline.size).toBe(0)
  })
})

describe("Built-in middleware", () => {
  it("createLoggingMiddleware logs events", () => {
    const logFn = vi.fn()
    const mw = createLoggingMiddleware(logFn)
    const event = createTestEvent("worker.spawned")

    const result = mw.process(event, (e) => e)
    expect(result).toBe(event)
    expect(logFn).toHaveBeenCalledWith(expect.stringContaining("worker.spawned"))
  })

  it("createReplayGradeFilter drops non-replay-grade events", () => {
    const mw = createReplayGradeFilter()

    const replayEvent = createTestEvent("worker.spawned", true)
    expect(mw.process(replayEvent, (e) => e)).toBe(replayEvent)

    const nonReplayEvent = createTestEvent("worker.output_streamed", false)
    expect(mw.process(nonReplayEvent, (e) => e)).toBeNull()
  })

  it("createWorkspaceScopeFilter drops events from other workspaces", () => {
    const mw = createWorkspaceScopeFilter("ws_target")

    const matching = createTestEvent("worker.spawned", true, "ws_target")
    expect(mw.process(matching, (e) => e)).toBe(matching)

    const nonMatching = createTestEvent("worker.spawned", true, "ws_other")
    expect(mw.process(nonMatching, (e) => e)).toBeNull()
  })
})
