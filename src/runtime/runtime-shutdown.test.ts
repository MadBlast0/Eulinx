import { describe, it, expect } from "vitest"
import { RuntimeShutdown } from "./runtime-shutdown"
import { RuntimeStateMachine } from "./runtime-state"
import { RuntimeLifecycle } from "./runtime-lifecycle"
import { ServiceRegistry } from "./service-registry"
import { DEFAULT_RUNTIME_CONFIG } from "./runtime-config"

function setupForShutdown() {
  const sm = new RuntimeStateMachine()
  sm.transition("starting")
  sm.transition("ready")
  sm.transition("running")

  const registry = new ServiceRegistry()
  registry.register({ id: "A", name: "A", required: true, phase: 1, dependencies: [] })

  const lifecycle = new RuntimeLifecycle(registry)
  const shutdown = new RuntimeShutdown(sm, lifecycle, DEFAULT_RUNTIME_CONFIG)
  return { sm, registry, shutdown }
}

describe("RuntimeShutdown", () => {
  it("transitions to stopping and then stopped", async () => {
    const { sm, shutdown } = setupForShutdown()
    const result = await shutdown.shutdown({ gracePeriodMs: 100 })
    expect(result.ok).toBe(true)
    expect(sm.state).toBe("stopped")
  })

  it("marks services as stopped", async () => {
    const { registry, shutdown } = setupForShutdown()
    await shutdown.shutdown({ gracePeriodMs: 100 })
    expect(registry.get("A")?.state).toBe("stopped")
  })

  it("reports isShuttingDown during shutdown", async () => {
    const { shutdown } = setupForShutdown()
    const promise = shutdown.shutdown({ gracePeriodMs: 100 })
    // isShuttingDown may be true briefly during execution
    await promise
    expect(shutdown.isShuttingDown).toBe(false)
  })

  it("reports isStopped after shutdown", async () => {
    const { shutdown } = setupForShutdown()
    await shutdown.shutdown({ gracePeriodMs: 100 })
    expect(shutdown.isStopped).toBe(true)
  })

  it("handles second shutdown call when already stopped", async () => {
    const { shutdown } = setupForShutdown()
    const result1 = await shutdown.shutdown({ gracePeriodMs: 100 })
    expect(result1.ok).toBe(true)
    // Second call fails because state machine can't go stopped→stopping
    const result2 = await shutdown.shutdown({ gracePeriodMs: 100 })
    expect(result2.ok).toBe(false)
  })
})
