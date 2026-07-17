import { describe, it, expect, vi } from "vitest"
import { RuntimeLifecycle, type ServiceLifecycleHook } from "./runtime-lifecycle"
import { ServiceRegistry } from "./service-registry"

function makeHook(id: string, shouldFail = false): ServiceLifecycleHook {
  return {
    id,
    async start() {
      if (shouldFail) return { ok: false, error: { code: "internal_error", message: "failed" } as never }
      return { ok: true, value: undefined }
    },
    async stop() {
      return { ok: true, value: undefined }
    },
  }
}

describe("RuntimeLifecycle", () => {
  it("starts services in phase order", async () => {
    const registry = new ServiceRegistry()
    registry.register({ id: "A", name: "A", required: true, phase: 1, dependencies: [] })
    registry.register({ id: "B", name: "B", required: true, phase: 2, dependencies: ["A"] })

    const lifecycle = new RuntimeLifecycle(registry)
    const result = await lifecycle.startServices()
    expect(result.ok).toBe(true)
    expect(registry.get("A")?.state).toBe("running")
    expect(registry.get("B")?.state).toBe("running")
  })

  it("stops services in reverse phase order", async () => {
    const registry = new ServiceRegistry()
    registry.register({ id: "A", name: "A", required: true, phase: 1, dependencies: [] })
    registry.register({ id: "B", name: "B", required: true, phase: 2, dependencies: ["A"] })

    const lifecycle = new RuntimeLifecycle(registry)
    await lifecycle.startServices()
    const result = await lifecycle.stopServices()
    expect(result.ok).toBe(true)
    expect(registry.get("A")?.state).toBe("stopped")
    expect(registry.get("B")?.state).toBe("stopped")
  })

  it("calls lifecycle hooks", async () => {
    const registry = new ServiceRegistry()
    registry.register({ id: "A", name: "A", required: true, phase: 1, dependencies: [] })

    const hook = makeHook("A")
    const startSpy = vi.spyOn(hook, "start")

    const lifecycle = new RuntimeLifecycle(registry)
    lifecycle.registerHook(hook)
    await lifecycle.startServices()
    expect(startSpy).toHaveBeenCalled()
  })

  it("returns error when required service hook fails", async () => {
    const registry = new ServiceRegistry()
    registry.register({ id: "A", name: "A", required: true, phase: 1, dependencies: [] })

    const lifecycle = new RuntimeLifecycle(registry)
    lifecycle.registerHook(makeHook("A", true))
    const result = await lifecycle.startServices()
    expect(result.ok).toBe(false)
  })

  it("allows optional service hook to fail", async () => {
    const registry = new ServiceRegistry()
    registry.register({ id: "A", name: "A", required: false, phase: 1, dependencies: [] })

    const lifecycle = new RuntimeLifecycle(registry)
    lifecycle.registerHook(makeHook("A", true))
    const result = await lifecycle.startServices()
    expect(result.ok).toBe(true)
  })

  it("reloads a service", async () => {
    const registry = new ServiceRegistry()
    registry.register({ id: "A", name: "A", required: true, phase: 1, dependencies: [] })

    const lifecycle = new RuntimeLifecycle(registry)
    const hook = makeHook("A")
    lifecycle.registerHook(hook)
    await lifecycle.startServices()
    const result = await lifecycle.reloadService("A")
    expect(result.ok).toBe(true)
  })

  it("returns error for reload of unknown service", async () => {
    const registry = new ServiceRegistry()
    const lifecycle = new RuntimeLifecycle(registry)
    const result = await lifecycle.reloadService("Unknown")
    expect(result.ok).toBe(false)
  })

  it("checks health of all services", async () => {
    const registry = new ServiceRegistry()
    registry.register({ id: "A", name: "A", required: true, phase: 1, dependencies: [] })
    registry.markState("A", "running")

    const lifecycle = new RuntimeLifecycle(registry)
    const result = await lifecycle.checkHealth()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.get("A")).toBe(true)
    }
  })
})
