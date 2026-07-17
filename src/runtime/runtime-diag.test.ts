import { describe, it, expect } from "vitest"
import { RuntimeDiagnosticsCollector } from "./runtime-diag"
import { ServiceRegistry } from "./service-registry"
import { RuntimeHealthMonitor } from "./runtime-health"

describe("RuntimeDiagnosticsCollector", () => {
  it("records diagnostic entries", () => {
    const collector = new RuntimeDiagnosticsCollector()
    collector.info("test", "info message")
    collector.warn("test", "warn message")
    collector.error("test", "error message")

    const events = collector.getEvents()
    expect(events).toHaveLength(3)
    expect(events[0]?.level).toBe("info")
    expect(events[1]?.level).toBe("warn")
    expect(events[2]?.level).toBe("error")
  })

  it("limits events to maxEvents", () => {
    const collector = new RuntimeDiagnosticsCollector(5)
    for (let i = 0; i < 10; i++) {
      collector.info("test", `message ${i}`)
    }
    expect(collector.getEvents()).toHaveLength(5)
    expect(collector.getEvents()[0]?.message).toBe("message 5")
  })

  it("marks started time", () => {
    const collector = new RuntimeDiagnosticsCollector()
    collector.markStarted()
    expect(collector.collect("running", {
      runtimeState: "running",
      overallStatus: "healthy",
      services: [],
      activeExecutionCount: 0,
      activeWorkerCount: 0,
      pendingApprovalCount: 0,
      blockedTaskCount: 0,
      updatedAt: new Date().toISOString(),
    }, []).startedAt).toBeDefined()
  })

  it("collects diagnostics snapshot", () => {
    const collector = new RuntimeDiagnosticsCollector()
    collector.markStarted()
    collector.info("test", "message")

    const registry = new ServiceRegistry()
    registry.register({ id: "S1", name: "S1", required: true, phase: 1, dependencies: [] })
    registry.markState("S1", "running")

    const monitor = new RuntimeHealthMonitor()
    const health = monitor.getSnapshot("running", registry)

    const diag = collector.collect("running", health, registry.getAll())
    expect(diag.runtimeState).toBe("running")
    expect(diag.overallHealth).toBe("healthy")
    expect(diag.serviceCount).toBe(1)
    expect(diag.healthyServiceCount).toBe(1)
    expect(diag.recentEvents).toHaveLength(2) // markStarted + info
  })

  it("clears events", () => {
    const collector = new RuntimeDiagnosticsCollector()
    collector.info("test", "message")
    collector.clearEvents()
    expect(collector.getEvents()).toHaveLength(0)
  })
})
