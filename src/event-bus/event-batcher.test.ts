/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { UiBatcher } from "./event-batcher"
import { DEFAULT_EVENT_BUS_CONFIG } from "./event-bus-config"
import type { EulinxEventUnion } from "./event-types"
import type { WorkspaceId } from "@/core/types"

function createTestEvent(type: string, sequence: number, payload: unknown = {}): EulinxEventUnion {
  return {
    eventId: `evt_${sequence}`,
    sequence,
    type,
    payload,
    source: { service: "RuntimeManager" },
    workspaceId: "ws_test" as WorkspaceId,
    replayGrade: true,
    emittedAt: new Date().toISOString(),
  } as EulinxEventUnion
}

describe("UiBatcher", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("flushes on timer interval", () => {
    const onFlush = vi.fn()
    const batcher = new UiBatcher(DEFAULT_EVENT_BUS_CONFIG, onFlush)

    batcher.push(createTestEvent("worker.spawned", 1))
    expect(onFlush).not.toHaveBeenCalled()

    vi.advanceTimersByTime(DEFAULT_EVENT_BUS_CONFIG.uiBatchIntervalMs)
    expect(onFlush).toHaveBeenCalledTimes(1)

    batcher.shutdown()
  })

  it("flushes immediately on max batch size", () => {
    const onFlush = vi.fn()
    const batcher = new UiBatcher(DEFAULT_EVENT_BUS_CONFIG, onFlush)

    for (let i = 0; i < DEFAULT_EVENT_BUS_CONFIG.uiBatchMaxSize; i++) {
      batcher.push(createTestEvent("worker.spawned", i + 1))
    }

    expect(onFlush).toHaveBeenCalledTimes(1)
    batcher.shutdown()
  })

  it("flushes immediately for merge events", () => {
    const onFlush = vi.fn()
    const batcher = new UiBatcher(DEFAULT_EVENT_BUS_CONFIG, onFlush)

    batcher.push(createTestEvent("worker.spawned", 1))
    batcher.push(createTestEvent("merge.applied", 2))

    // merge.applied flushes existing batch (worker.spawned), then emits itself
    expect(onFlush).toHaveBeenCalledTimes(2)
    const firstCall = onFlush.mock.calls[0]![0]!
    expect(firstCall.events[0]!.type).toBe("worker.spawned")
    expect(firstCall.events[0]!.sequence).toBe(1)
    const secondCall = onFlush.mock.calls[1]![0]!
    expect(secondCall.events[0]!.type).toBe("merge.applied")

    batcher.shutdown()
  })

  it("flushes immediately for permission events", () => {
    const onFlush = vi.fn()
    const batcher = new UiBatcher(DEFAULT_EVENT_BUS_CONFIG, onFlush)

    batcher.push(createTestEvent("permission.granted", 1))
    expect(onFlush).toHaveBeenCalledTimes(1)
    batcher.shutdown()
  })

  it("coalesces output stream events by source key", () => {
    const onFlush = vi.fn()
    const batcher = new UiBatcher(DEFAULT_EVENT_BUS_CONFIG, onFlush)

    batcher.push(createTestEvent("worker.output_streamed", 1, {
      workerId: "wkr_1",
      channel: "stdout",
      chunk: "hello ",
      chunkIndex: 0,
    }))
    batcher.push(createTestEvent("worker.output_streamed", 2, {
      workerId: "wkr_1",
      channel: "stdout",
      chunk: "world",
      chunkIndex: 1,
    }))

    vi.advanceTimersByTime(DEFAULT_EVENT_BUS_CONFIG.uiBatchIntervalMs)

    expect(onFlush).toHaveBeenCalledTimes(1)
    const batch = onFlush.mock.calls[0]![0]!
    expect(batch.events.length).toBe(1) // coalesced into one
    expect((batch.events[0]!.payload as { chunk: string }).chunk).toBe("hello world")

    batcher.shutdown()
  })

  it("coalesces progress events by replacement", () => {
    const onFlush = vi.fn()
    const batcher = new UiBatcher(DEFAULT_EVENT_BUS_CONFIG, onFlush)

    batcher.push(createTestEvent("execution.progress_reported", 1, {
      executionId: "exe_1",
      percent: 10,
    }))
    batcher.push(createTestEvent("execution.progress_reported", 2, {
      executionId: "exe_1",
      percent: 50,
    }))

    vi.advanceTimersByTime(DEFAULT_EVENT_BUS_CONFIG.uiBatchIntervalMs)

    expect(onFlush).toHaveBeenCalledTimes(1)
    const batch = onFlush.mock.calls[0]![0]!
    expect(batch.events.length).toBe(1) // replaced
    expect((batch.events[0]!.payload as { percent: number }).percent).toBe(50)

    batcher.shutdown()
  })

  it("tracks dropped events", () => {
    const onFlush = vi.fn()
    const batcher = new UiBatcher(DEFAULT_EVENT_BUS_CONFIG, onFlush)

    batcher.recordDrop()
    batcher.recordDrop()
    batcher.push(createTestEvent("worker.spawned", 1))

    vi.advanceTimersByTime(DEFAULT_EVENT_BUS_CONFIG.uiBatchIntervalMs)

    const batch = onFlush.mock.calls[0]![0]!
    expect(batch.droppedSinceLastBatch).toBe(2)

    batcher.shutdown()
  })

  it("shutdown flushes remaining events", () => {
    const onFlush = vi.fn()
    const batcher = new UiBatcher(DEFAULT_EVENT_BUS_CONFIG, onFlush)

    batcher.push(createTestEvent("worker.spawned", 1))
    batcher.shutdown()

    expect(onFlush).toHaveBeenCalledTimes(1)
  })

  it("reports stats", () => {
    const onFlush = vi.fn()
    const batcher = new UiBatcher(DEFAULT_EVENT_BUS_CONFIG, onFlush)

    batcher.push(createTestEvent("worker.spawned", 1))

    expect(batcher.stats.openBatchSize).toBe(1)
    expect(batcher.stats.totalEventsBatched).toBe(0)

    batcher.shutdown()

    expect(batcher.stats.openBatchSize).toBe(0)
    expect(batcher.stats.totalEventsBatched).toBe(1)
  })
})
