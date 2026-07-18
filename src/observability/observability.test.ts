/**
 * P19-OBS — Observability Tests
 */

import { describe, it, expect } from "vitest"
import { MetricsCollector, DEFAULT_METRICS } from "./metrics"
import { Tracer } from "./tracing"
import { Profiler } from "./profiling"
import { HealthMonitor } from "./health"
import { AlertManager } from "./alerts"
import { AnalyticsTracker } from "./analytics"
import { CostTracker } from "./cost"
import { PerformanceMonitor } from "./performance"

describe("MetricsCollector", () => {
  it("increments counters", () => {
    const collector = new MetricsCollector()
    collector.register({ name: "test_counter", kind: "counter", description: "test", unit: "count", labels: [] })
    collector.increment("test_counter")
    collector.increment("test_counter", 5)
    const snapshot = collector.snapshot()
    expect(snapshot.length).toBeGreaterThan(0)
    expect(snapshot.find((s) => s.name === "test_counter")?.value).toBe(6)
  })

  it("sets gauges", () => {
    const collector = new MetricsCollector()
    collector.register({ name: "test_gauge", kind: "gauge", description: "test", unit: "count", labels: [] })
    collector.gauge("test_gauge", 42)
    const snapshot = collector.snapshot()
    expect(snapshot.find((s) => s.name === "test_gauge")?.value).toBe(42)
  })

  it("records histograms", () => {
    const collector = new MetricsCollector()
    collector.register({ name: "test_hist", kind: "histogram", description: "test", unit: "ms", labels: [] })
    collector.histogram("test_hist", 10)
    collector.histogram("test_hist", 20)
    collector.histogram("test_hist", 30)
    const snapshot = collector.snapshot()
    const hist = snapshot.find((s) => s.name === "test_hist")
    expect(hist?.count).toBe(3)
    expect(hist?.min).toBe(10)
    expect(hist?.max).toBe(30)
  })

  it("resets all metrics", () => {
    const collector = new MetricsCollector()
    collector.register({ name: "reset_test", kind: "counter", description: "test", unit: "count", labels: [] })
    collector.increment("reset_test")
    collector.reset()
    const snapshot = collector.snapshot()
    const counter = snapshot.find((s) => s.name === "reset_test")
    expect(counter?.value).toBe(0)
  })

  it("has default metrics", () => {
    expect(DEFAULT_METRICS.length).toBeGreaterThan(0)
  })
})

describe("Tracer", () => {
  it("creates and finishes spans", () => {
    const tracer = new Tracer()
    const { spanId } = tracer.startSpan("test", "service", "op")
    const span = tracer.finishSpan(spanId)
    expect(span).toBeDefined()
    expect(span!.endTime).toBeDefined()
    expect(span!.durationMs).toBeGreaterThanOrEqual(0)
  })

  it("adds events to spans", () => {
    const tracer = new Tracer()
    const { spanId } = tracer.startSpan("test", "service", "op")
    tracer.addEvent(spanId, "event1", { key: "value" })
    const span = tracer.getSpan(spanId)
    expect(span!.events).toHaveLength(1)
  })

  it("tracks parent-child relationships", () => {
    const tracer = new Tracer()
    const { spanId: parent } = tracer.startSpan("parent", "service", "op")
    const { traceId } = tracer.startSpan("child", "service", "op", parent)
    const traceSpans = tracer.getTraceSpans(traceId)
    expect(traceSpans).toHaveLength(2)
  })

  it("clears all spans", () => {
    const tracer = new Tracer()
    tracer.startSpan("test", "service", "op")
    tracer.clear()
    expect(tracer.getAllSpans()).toHaveLength(0)
  })
})

describe("Profiler", () => {
  it("starts and stops sessions", () => {
    const profiler = new Profiler()
    profiler.startSession()
    profiler.recordEvent("cpu", 100)
    profiler.recordEvent("memory", 50, { bytes: 1024 })
    const session = profiler.stopSession()
    expect(session).toBeDefined()
    expect(session!.events).toHaveLength(2)
    expect(session!.summary.totalDurationMs).toBe(150)
  })

  it("tracks GC events", () => {
    const profiler = new Profiler()
    profiler.startSession()
    profiler.recordEvent("gc", 10)
    profiler.recordEvent("gc", 20)
    const session = profiler.stopSession()
    expect(session!.summary.gcCount).toBe(2)
    expect(session!.summary.gcPauseMs).toBe(30)
  })

  it("clears sessions", () => {
    const profiler = new Profiler()
    profiler.startSession()
    profiler.stopSession()
    profiler.clear()
    expect(profiler.getAllSessions()).toHaveLength(0)
  })
})

describe("HealthMonitor", () => {
  it("runs health checks", async () => {
    const monitor = new HealthMonitor()
    monitor.register("test", () => ({
      name: "test",
      status: "healthy",
      message: "ok",
      durationMs: 0,
      checkedAt: new Date().toISOString() as any,
    }))
    const snapshot = await monitor.check()
    expect(snapshot.status).toBe("healthy")
    expect(snapshot.checks).toHaveLength(1)
  })

  it("detects unhealthy checks", async () => {
    const monitor = new HealthMonitor()
    monitor.register("bad", () => ({
      name: "bad",
      status: "unhealthy",
      message: "fail",
      durationMs: 0,
      checkedAt: new Date().toISOString() as any,
    }))
    const snapshot = await monitor.check()
    expect(snapshot.status).toBe("unhealthy")
  })

  it("handles check errors", async () => {
    const monitor = new HealthMonitor()
    monitor.register("error", () => { throw new Error("boom") })
    const snapshot = await monitor.check()
    expect(snapshot.checks[0]!.status).toBe("unhealthy")
  })
})

describe("AlertManager", () => {
  it("triggers alerts when condition met", () => {
    const manager = new AlertManager()
    manager.addRule({
      ruleId: "r1",
      name: "High CPU",
      description: "CPU > 90%",
      metric: "cpu",
      condition: "greater_than",
      threshold: 90,
      durationMs: 0,
      severity: "warning",
      enabled: true,
    })
    const alert = manager.evaluate("cpu", 95)
    expect(alert).not.toBeNull()
    expect(alert!.severity).toBe("warning")
  })

  it("does not trigger when condition not met", () => {
    const manager = new AlertManager()
    manager.addRule({
      ruleId: "r1", name: "High CPU", description: "", metric: "cpu",
      condition: "greater_than", threshold: 90, durationMs: 0,
      severity: "warning", enabled: true,
    })
    const alert = manager.evaluate("cpu", 50)
    expect(alert).toBeNull()
  })

  it("acknowledges alerts", () => {
    const manager = new AlertManager()
    manager.addRule({
      ruleId: "r1", name: "test", description: "", metric: "x",
      condition: "greater_than", threshold: 0, durationMs: 0,
      severity: "info", enabled: true,
    })
    const alert = manager.evaluate("x", 1)!
    const ack = manager.acknowledge(alert.alertId)
    expect(ack!.status).toBe("acknowledged")
  })

  it("resolves alerts", () => {
    const manager = new AlertManager()
    manager.addRule({
      ruleId: "r1", name: "test", description: "", metric: "x",
      condition: "greater_than", threshold: 0, durationMs: 0,
      severity: "info", enabled: true,
    })
    const alert = manager.evaluate("x", 1)!
    const resolved = manager.resolve(alert.alertId)
    expect(resolved!.status).toBe("resolved")
  })
})

describe("AnalyticsTracker", () => {
  it("tracks events", () => {
    const tracker = new AnalyticsTracker()
    const event = tracker.track("worker_spawned", "ws1" as any)
    expect(event.eventId).toBeDefined()
    expect(tracker.getTotalCount()).toBe(1)
  })

  it("filters by kind", () => {
    const tracker = new AnalyticsTracker()
    tracker.track("worker_spawned", "ws1" as any)
    tracker.track("worker_completed", "ws1" as any)
    tracker.track("worker_spawned", "ws1" as any)
    expect(tracker.getByKind("worker_spawned")).toHaveLength(2)
  })

  it("counts by kind", () => {
    const tracker = new AnalyticsTracker()
    tracker.track("worker_spawned", "ws1" as any)
    tracker.track("worker_completed", "ws1" as any)
    const counts = tracker.getCountsByKind()
    expect(counts["worker_spawned"]).toBe(1)
    expect(counts["worker_completed"]).toBe(1)
  })
})

describe("CostTracker", () => {
  it("records cost entries", () => {
    const tracker = new CostTracker()
    tracker.record({
      provider: "openai", model: "gpt-4", inputTokens: 100, outputTokens: 50,
      cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0.01, latencyMs: 200,
      workspaceId: "ws1" as any, kind: "chat",
    })
    expect(tracker.getTotalCost()).toBe(0.01)
    expect(tracker.getTotalTokens()).toBe(150)
  })

  it("generates summary", () => {
    const tracker = new CostTracker()
    tracker.record({
      provider: "openai", model: "gpt-4", inputTokens: 100, outputTokens: 50,
      cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0.01, latencyMs: 200,
      workspaceId: "ws1" as any, kind: "chat",
    })
    const summary = tracker.getSummary("all")
    expect(summary.totalCostUsd).toBe(0.01)
    expect(summary.byProvider["openai"]).toBeDefined()
  })
})

describe("PerformanceMonitor", () => {
  it("collects metrics", () => {
    const monitor = new PerformanceMonitor()
    const metrics = monitor.collect()
    expect(metrics.uptime).toBeGreaterThan(0)
    expect(metrics.heapUsedMb).toBeGreaterThan(0)
    expect(metrics.timestamp).toBeDefined()
  })

  it("tracks history", () => {
    const monitor = new PerformanceMonitor()
    monitor.collect()
    monitor.collect()
    expect(monitor.getHistory()).toHaveLength(2)
  })

  it("computes averages", () => {
    const monitor = new PerformanceMonitor()
    monitor.collect()
    monitor.collect()
    const avg = monitor.getAverages(2)
    expect(avg.heapUsedMb).toBeGreaterThan(0)
  })
})
