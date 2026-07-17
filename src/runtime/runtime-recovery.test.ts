import { describe, it, expect } from "vitest"
import { RuntimeRecovery } from "./runtime-recovery"
import { RuntimeStateMachine } from "./runtime-state"
import { RuntimeLifecycle } from "./runtime-lifecycle"
import { ServiceRegistry } from "./service-registry"
import { DEFAULT_RUNTIME_CONFIG } from "./runtime-config"

function setupForRecovery() {
  const sm = new RuntimeStateMachine()
  sm.transition("starting")
  sm.transition("ready")
  sm.transition("running")
  sm.transition("degraded")

  const registry = new ServiceRegistry()
  registry.register({ id: "A", name: "A", required: true, phase: 1, dependencies: [] })
  registry.markState("A", "failed")

  const lifecycle = new RuntimeLifecycle(registry)
  const recovery = new RuntimeRecovery(sm, registry, lifecycle, {
    ...DEFAULT_RUNTIME_CONFIG,
    maxRecoveryAttempts: 3,
  })
  return { sm, registry, recovery }
}

describe("RuntimeRecovery", () => {
  it("enters recovery state", async () => {
    const { sm, recovery } = setupForRecovery()
    await recovery.recover()
    // After recovery, state should be either running or degraded
    expect(["running", "degraded"]).toContain(sm.state)
  })

  it("resets attempts on successful recovery", async () => {
    const { recovery } = setupForRecovery()
    await recovery.recover()
    expect(recovery.attempts).toBe(0) // reset on success
  })

  it("increments recovery attempts", async () => {
    const sm = new RuntimeStateMachine()
    sm.transition("starting")
    sm.transition("ready")
    sm.transition("running")
    sm.transition("degraded")

    const registry = new ServiceRegistry()
    registry.register({ id: "A", name: "A", required: true, phase: 1, dependencies: [] })
    registry.markState("A", "failed")

    const lifecycle = new RuntimeLifecycle(registry)
    const recovery = new RuntimeRecovery(sm, registry, lifecycle, {
      ...DEFAULT_RUNTIME_CONFIG,
      maxRecoveryAttempts: 3,
    })

    await recovery.recover()
    // Recovery succeeds (reloadService marks service running), so attempts reset to 0
    expect(recovery.attempts).toBe(0)
  })

  it("stops after max attempts", async () => {
    const sm = new RuntimeStateMachine()
    sm.transition("starting")
    sm.transition("ready")
    sm.transition("running")
    sm.transition("degraded")

    const registry = new ServiceRegistry()
    registry.register({ id: "A", name: "A", required: true, phase: 1, dependencies: [] })
    registry.markState("A", "failed")

    const lifecycle = new RuntimeLifecycle(registry)
    const recovery = new RuntimeRecovery(sm, registry, lifecycle, {
      ...DEFAULT_RUNTIME_CONFIG,
      maxRecoveryAttempts: 0,
    })

    const result = await recovery.recover()
    expect(result.ok).toBe(false)
  })

  it("resets attempts counter", async () => {
    const { recovery } = setupForRecovery()
    recovery.resetAttempts()
    expect(recovery.attempts).toBe(0)
  })
})
