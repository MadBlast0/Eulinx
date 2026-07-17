import { describe, it, expect } from "vitest"
import { bootstrapServiceRegistry, CORE_SERVICE_DEFINITIONS } from "./runtime-bootstrap"
import { ServiceRegistry } from "./service-registry"

describe("bootstrapServiceRegistry", () => {
  it("registers all core services", () => {
    const registry = new ServiceRegistry()
    bootstrapServiceRegistry(registry)
    expect(registry.getAll()).toHaveLength(CORE_SERVICE_DEFINITIONS.length)
  })

  it("registers services with correct phases", () => {
    const registry = new ServiceRegistry()
    bootstrapServiceRegistry(registry)
    const phases = registry.getByPhase()
    expect(phases.has(1)).toBe(true) // EventBus
    expect(phases.has(2)).toBe(true) // Safety services
    expect(phases.has(3)).toBe(true) // Data services
    expect(phases.has(4)).toBe(true) // Capability services
    expect(phases.has(5)).toBe(true) // Execution services
  })

  it("registers extra services", () => {
    const registry = new ServiceRegistry()
    bootstrapServiceRegistry(registry, [
      { id: "Custom", name: "Custom", required: false, phase: 6, dependencies: [] },
    ])
    expect(registry.has("Custom")).toBe(true)
  })

  it("marks required services correctly", () => {
    const registry = new ServiceRegistry()
    bootstrapServiceRegistry(registry)
    const eventBus = registry.get("EventBus")
    expect(eventBus?.definition.required).toBe(true)
  })

  it("marks optional services correctly", () => {
    const registry = new ServiceRegistry()
    bootstrapServiceRegistry(registry)
    const memoryManager = registry.get("MemoryManager")
    expect(memoryManager?.definition.required).toBe(false)
  })

  it("sets up correct dependency chains", () => {
    const registry = new ServiceRegistry()
    bootstrapServiceRegistry(registry)
    const scheduler = registry.get("Scheduler")
    expect(scheduler?.definition.dependencies).toContain("WorkerSpawner")
    expect(scheduler?.definition.dependencies).toContain("EventBus")
  })
})
