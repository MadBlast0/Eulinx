import { describe, it, expect } from "vitest"
import { ServiceRegistry, type RuntimeServiceDefinition } from "./service-registry"

function makeService(overrides: Partial<RuntimeServiceDefinition> = {}): RuntimeServiceDefinition {
  return {
    id: "TestService",
    name: "TestService",
    required: true,
    phase: 1,
    dependencies: [],
    ...overrides,
  }
}

describe("ServiceRegistry", () => {
  it("registers a service", () => {
    const registry = new ServiceRegistry()
    const result = registry.register(makeService())
    expect(result.ok).toBe(true)
    expect(registry.has("TestService")).toBe(true)
  })

  it("rejects duplicate registration", () => {
    const registry = new ServiceRegistry()
    registry.register(makeService())
    const result = registry.register(makeService())
    expect(result.ok).toBe(false)
  })

  it("unregisters a service", () => {
    const registry = new ServiceRegistry()
    registry.register(makeService())
    const result = registry.unregister("TestService")
    expect(result.ok).toBe(true)
    expect(registry.has("TestService")).toBe(false)
  })

  it("returns error for unregistering unknown service", () => {
    const registry = new ServiceRegistry()
    const result = registry.unregister("Unknown")
    expect(result.ok).toBe(false)
  })

  it("gets a service", () => {
    const registry = new ServiceRegistry()
    registry.register(makeService({ id: "S1" }))
    const entry = registry.get("S1")
    expect(entry).toBeDefined()
    expect(entry?.definition.id).toBe("S1")
  })

  it("gets all services", () => {
    const registry = new ServiceRegistry()
    registry.register(makeService({ id: "S1" }))
    registry.register(makeService({ id: "S2" }))
    expect(registry.getAll()).toHaveLength(2)
  })

  it("groups services by phase", () => {
    const registry = new ServiceRegistry()
    registry.register(makeService({ id: "S1", phase: 1 }))
    registry.register(makeService({ id: "S2", phase: 2 }))
    registry.register(makeService({ id: "S3", phase: 1 }))
    const phases = registry.getByPhase()
    expect(phases.get(1)).toHaveLength(2)
    expect(phases.get(2)).toHaveLength(1)
  })

  it("checks dependencies are ready", () => {
    const registry = new ServiceRegistry()
    registry.register(makeService({ id: "A", phase: 1, dependencies: [] }))
    registry.register(makeService({ id: "B", phase: 2, dependencies: ["A"] }))

    expect(registry.areDependenciesReady("B")).toBe(false)

    registry.markState("A", "running")
    expect(registry.areDependenciesReady("B")).toBe(true)
  })

  it("gets services ready to start", () => {
    const registry = new ServiceRegistry()
    registry.register(makeService({ id: "A", phase: 1, dependencies: [] }))
    registry.register(makeService({ id: "B", phase: 2, dependencies: ["A"] }))

    const ready = registry.getReadyToStart()
    expect(ready).toHaveLength(1)
    expect(ready[0]?.definition.id).toBe("A")
  })

  it("updates service state", () => {
    const registry = new ServiceRegistry()
    registry.register(makeService())
    const result = registry.markState("TestService", "running")
    expect(result.ok).toBe(true)
    expect(registry.get("TestService")?.state).toBe("running")
  })

  it("records heartbeat", () => {
    const registry = new ServiceRegistry()
    registry.register(makeService())
    registry.markState("TestService", "running")
    const result = registry.heartbeat("TestService")
    expect(result.ok).toBe(true)
    expect(registry.get("TestService")?.lastHeartbeatAt).toBeDefined()
  })

  it("checks all required healthy", () => {
    const registry = new ServiceRegistry()
    registry.register(makeService({ id: "R1", required: true }))
    registry.register(makeService({ id: "O1", required: false }))
    registry.markState("R1", "running")
    expect(registry.allRequiredHealthy()).toBe(true)
  })

  it("returns health snapshot", () => {
    const registry = new ServiceRegistry()
    registry.register(makeService({ id: "S1" }))
    registry.markState("S1", "running")
    const snapshot = registry.getHealthSnapshot()
    expect(snapshot).toHaveLength(1)
    expect(snapshot[0]?.serviceId).toBe("S1")
    expect(snapshot[0]?.state).toBe("running")
  })

  it("clears all services", () => {
    const registry = new ServiceRegistry()
    registry.register(makeService({ id: "S1" }))
    registry.register(makeService({ id: "S2" }))
    registry.clear()
    expect(registry.getAll()).toHaveLength(0)
  })
})
