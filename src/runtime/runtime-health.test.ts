import { describe, it, expect, vi } from "vitest"
import { RuntimeHealthMonitor } from "./runtime-health"
import { ServiceRegistry } from "./service-registry"

function makeRegistry() {
  const registry = new ServiceRegistry()
  registry.register({ id: "EventBus", name: "EventBus", required: true, phase: 1, dependencies: [] })
  registry.register({ id: "PermissionManager", name: "PermissionManager", required: true, phase: 2, dependencies: ["EventBus"] })
  registry.register({ id: "OptionalService", name: "OptionalService", required: false, phase: 3, dependencies: [] })
  return registry
}

describe("RuntimeHealthMonitor", () => {
  it("returns healthy when all required services are running", () => {
    const monitor = new RuntimeHealthMonitor()
    const registry = makeRegistry()
    registry.markState("EventBus", "running")
    registry.markState("PermissionManager", "running")
    registry.markState("OptionalService", "running")

    const health = monitor.computeOverallHealth(registry)
    expect(health).toBe("healthy")
  })

  it("returns degraded when optional service fails", () => {
    const monitor = new RuntimeHealthMonitor()
    const registry = makeRegistry()
    registry.markState("EventBus", "running")
    registry.markState("PermissionManager", "running")
    registry.markState("OptionalService", "failed")

    const health = monitor.computeOverallHealth(registry)
    expect(health).toBe("degraded")
  })

  it("returns unsafe when safety-critical service is not running", () => {
    const monitor = new RuntimeHealthMonitor()
    const registry = makeRegistry()
    registry.markState("EventBus", "running")
    // PermissionManager is safety-critical and not running

    const health = monitor.computeOverallHealth(registry)
    expect(health).toBe("unsafe")
  })

  it("returns failed when required service fails", () => {
    const monitor = new RuntimeHealthMonitor()
    const registry = makeRegistry()
    registry.markState("EventBus", "failed")
    registry.markState("PermissionManager", "running")

    const health = monitor.computeOverallHealth(registry)
    expect(health).toBe("failed")
  })

  it("builds full health snapshot", () => {
    const monitor = new RuntimeHealthMonitor()
    const registry = makeRegistry()
    registry.markState("EventBus", "running")
    registry.markState("PermissionManager", "running")

    const snapshot = monitor.getSnapshot("running", registry, {
      activeExecutions: 5,
      activeWorkers: 3,
    })
    expect(snapshot.runtimeState).toBe("running")
    expect(snapshot.overallStatus).toBe("healthy")
    expect(snapshot.activeExecutionCount).toBe(5)
    expect(snapshot.activeWorkerCount).toBe(3)
    expect(snapshot.services).toHaveLength(3)
    expect(snapshot.updatedAt).toBeDefined()
  })

  it("starts and stops periodic checks", () => {
    const monitor = new RuntimeHealthMonitor()
    const checker = vi.fn()
    monitor.startPeriodicChecks(1000, checker)
    monitor.stopPeriodicChecks()
  })

  it("registers health change listener", () => {
    const monitor = new RuntimeHealthMonitor()
    const listener = vi.fn()
    const unsub = monitor.onHealthChange(listener)
    expect(typeof unsub).toBe("function")
    unsub()
  })

  it("detects stalls when no progress", () => {
    const monitor = new RuntimeHealthMonitor()
    const previous = {
      runtimeState: "running" as const,
      overallStatus: "healthy" as const,
      services: [],
      activeExecutionCount: 5,
      activeWorkerCount: 3,
      pendingApprovalCount: 0,
      blockedTaskCount: 0,
      updatedAt: new Date().toISOString(),
    }
    const current = { ...previous, updatedAt: new Date().toISOString() }
    expect(monitor.detectStall(current, previous)).toBe(true)
  })

  it("does not detect stall when progress is made", () => {
    const monitor = new RuntimeHealthMonitor()
    const previous = {
      runtimeState: "running" as const,
      overallStatus: "healthy" as const,
      services: [],
      activeExecutionCount: 5,
      activeWorkerCount: 3,
      pendingApprovalCount: 0,
      blockedTaskCount: 0,
      updatedAt: new Date().toISOString(),
    }
    const current = { ...previous, activeExecutionCount: 4, updatedAt: new Date().toISOString() }
    expect(monitor.detectStall(current, previous)).toBe(false)
  })
})
