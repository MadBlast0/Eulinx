import { describe, it, expect } from "vitest"
import { EventRegistry } from "./event-registry"

describe("EventRegistry", () => {
  it("registers default event types", () => {
    const registry = new EventRegistry()
    expect(registry.has("worker.spawned")).toBe(true)
    expect(registry.has("merge.applied")).toBe(true)
    expect(registry.has("permission.granted")).toBe(true)
    expect(registry.has("runtime.started")).toBe(true)
  })

  it("rejects duplicate registration", () => {
    const registry = new EventRegistry()
    const result = registry.register({
      type: "worker.spawned",
      family: "worker",
      replayGrade: true,
      description: "Duplicate",
      publisher: "WorkerSpawner",
      highFrequency: false,
    })
    expect(result).toBe(false)
  })

  it("registers new event types", () => {
    const registry = new EventRegistry()
    const result = registry.register({
      type: "custom.new_event",
      family: "worker",
      replayGrade: true,
      description: "Custom event",
      publisher: "WorkerSpawner",
      highFrequency: false,
    })
    expect(result).toBe(true)
    expect(registry.has("custom.new_event")).toBe(true)
  })

  it("gets schema by type", () => {
    const registry = new EventRegistry()
    const schema = registry.get("worker.spawned")
    expect(schema).toBeDefined()
    expect(schema?.family).toBe("worker")
    expect(schema?.replayGrade).toBe(true)
    expect(schema?.publisher).toBe("WorkerSpawner")
  })

  it("returns all registered types", () => {
    const registry = new EventRegistry()
    const all = registry.all()
    expect(all.length).toBeGreaterThan(0)
    // Should have all 80+ event types from the catalog
    expect(all.length).toBeGreaterThanOrEqual(70)
  })

  it("filters by family", () => {
    const registry = new EventRegistry()
    const workerEvents = registry.byFamily("worker")
    expect(workerEvents.length).toBe(8) // 8 worker events
    expect(workerEvents.every((e) => e.family === "worker")).toBe(true)
  })

  it("filters replay-grade types", () => {
    const registry = new EventRegistry()
    const replayGrade = registry.replayGradeTypes()
    expect(replayGrade.length).toBe(8)
    expect(replayGrade.every((e) => e.replayGrade)).toBe(true)
  })

  it("filters high-frequency types", () => {
    const registry = new EventRegistry()
    const highFreq = registry.highFrequencyTypes()
    expect(highFreq.length).toBe(3) // output_streamed x2 + progress_reported
    expect(highFreq.every((e) => e.highFrequency)).toBe(true)
  })

  it("validates event name format", () => {
    expect(EventRegistry.validateEventName("worker.spawned")).toBe(true)
    expect(EventRegistry.validateEventName("merge.applied")).toBe(true)
    expect(EventRegistry.validateEventName("invalid")).toBe(false)
    expect(EventRegistry.validateEventName("")).toBe(false)
  })
})
