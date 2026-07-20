/**
 * P16-WF-TRIGGERS — TriggerEngine tests
 *
 * Covers: cron fires on interval, file_watch debounces bursts into a single
 * fire, webhook callback fires on registered path.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { TriggerEngine } from "./trigger-engine"
import type { TriggerEngineDeps } from "./trigger-engine"
import type { RunTrigger } from "../workflow-types"

function makeDeps(partial?: Partial<TriggerEngineDeps>): TriggerEngineDeps {
  return {
    run: vi.fn(async () => undefined),
    readSnapshot: undefined,
    webhookRegister: undefined,
    ...partial,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe("TriggerEngine — cron", () => {
  it("fires immediately and then every interval", () => {
    const run = vi.fn(async () => undefined)
    const engine = new TriggerEngine(makeDeps({ run }))

    engine.register("wf_cron", { kind: "cron", intervalMs: 1000 })

    // Immediate first tick.
    expect(run).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)
    expect(run).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(2000)
    expect(run).toHaveBeenCalledTimes(4)

    engine.stopAll()
  })

  it("passes a schedule_cron RunTrigger to run", () => {
    const run = vi.fn(async () => undefined)
    const engine = new TriggerEngine(makeDeps({ run }))
    engine.register("wf_cron", { kind: "cron", intervalMs: 5000 })

    const trigger = (run.mock.calls[0]?.[1] as RunTrigger)
    expect(trigger.kind).toBe("schedule_cron")
    expect(trigger.firedBy).toBe("trigger_engine")
    engine.stopAll()
  })
})

describe("TriggerEngine — file_watch", () => {
  it("debounces repeated changes into a single fire", async () => {
    let fingerprint = "a"
    const readSnapshot = vi.fn(() => fingerprint)
    const run = vi.fn(async () => undefined)
    const engine = new TriggerEngine(makeDeps({ run, readSnapshot }))

    engine.register("wf_fw", {
      kind: "file_watch",
      path: "/work/x",
      intervalMs: 100,
      debounceMs: 200,
    })

    // Capture baseline; no fire yet.
    expect(run).toHaveBeenCalledTimes(0)

    // Simulate a burst of changes.
    vi.advanceTimersByTime(100) // poll 1 -> change detected
    fingerprint = "b"
    vi.advanceTimersByTime(100) // poll 2 -> change detected
    fingerprint = "c"
    vi.advanceTimersByTime(100) // poll 3 -> change detected

    // Still inside debounce window: no fire.
    expect(run).toHaveBeenCalledTimes(0)

    // Clear debounce window.
    await vi.advanceTimersByTimeAsync(200)
    expect(run).toHaveBeenCalledTimes(1)

    engine.stopAll()
  })

  it("does not fire when the snapshot is unchanged", () => {
    const readSnapshot = vi.fn(() => "stable")
    const run = vi.fn(async () => undefined)
    const engine = new TriggerEngine(makeDeps({ run, readSnapshot }))

    engine.register("wf_fw", {
      kind: "file_watch",
      path: "/work/y",
      intervalMs: 50,
      debounceMs: 50,
    })

    vi.advanceTimersByTime(500)
    expect(run).toHaveBeenCalledTimes(0)
    engine.stopAll()
  })
})

describe("TriggerEngine — webhook", () => {
  it("fires the run callback when the registered path is invoked", () => {
    const registry = new Map<string, () => void>()
    const webhookRegister = (path: string, handler: () => void) => {
      registry.set(path, handler)
    }
    const run = vi.fn(async () => undefined)
    const engine = new TriggerEngine(makeDeps({ run, webhookRegister }))

    engine.register("wf_wh", { kind: "webhook", path: "deploy" })

    const handler = registry.get("/triggers/wf_wh/deploy")
    expect(handler).toBeTypeOf("function")

    handler?.()
    expect(run).toHaveBeenCalledTimes(1)
    const trigger = run.mock.calls[0]?.[1] as RunTrigger
    expect(trigger.kind).toBe("api_call")

    engine.stopAll()
  })
})
