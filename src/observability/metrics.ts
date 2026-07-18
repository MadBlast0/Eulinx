/**
 * P19-OBS-METRICS — Metrics Collector
 *
 * Collects and aggregates metrics: counters, gauges, histograms.
 * From RuntimeManager-Part01 §Runtime Diagnostics.
 */

import type { MetricDefinition, MetricSnapshot, MetricValue } from "./observability-types"

// ---------------------------------------------------------------------------
// Metric Store
// ---------------------------------------------------------------------------

interface MetricStore {
  readonly definition: MetricDefinition
  readonly values: MetricValue[]
}

// ---------------------------------------------------------------------------
// Metrics Collector
// ---------------------------------------------------------------------------

export class MetricsCollector {
  private readonly metrics = new Map<string, MetricStore>()
  private readonly counters = new Map<string, number>()
  private readonly gauges = new Map<string, number>()

  /**
   * Register a metric definition.
   */
  register(definition: MetricDefinition): void {
    this.metrics.set(definition.name, { definition, values: [] })
  }

  /**
   * Increment a counter metric.
   */
  increment(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    const key = this.makeKey(name, labels)
    const current = this.counters.get(key) ?? 0
    this.counters.set(key, current + value)
    this.recordValue(name, current + value, labels)
  }

  /**
   * Decrement a counter metric.
   */
  decrement(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    this.increment(name, -value, labels)
  }

  /**
   * Set a gauge metric.
   */
  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.makeKey(name, labels)
    this.gauges.set(key, value)
    this.recordValue(name, value, labels)
  }

  /**
   * Record a histogram value.
   */
  histogram(name: string, value: number, labels: Record<string, string> = {}): void {
    this.recordValue(name, value, labels)
  }

  /**
   * Get a snapshot of all metrics.
   */
  snapshot(): MetricSnapshot[] {
    const snapshots: MetricSnapshot[] = []

    for (const [name, store] of this.metrics) {
      const kind = store.definition.kind
      const values = store.values

      if (kind === "counter") {
        const key = this.makeKey(name, {})
        snapshots.push({
          name,
          kind,
          value: this.counters.get(key) ?? 0,
          labels: {},
        })
      } else if (kind === "gauge") {
        const key = this.makeKey(name, {})
        snapshots.push({
          name,
          kind,
          value: this.gauges.get(key) ?? 0,
          labels: {},
        })
      } else if (kind === "histogram" && values.length > 0) {
        const nums = values.map((v) => v.value).sort((a, b) => a - b)
        snapshots.push({
          name,
          kind,
          value: nums[nums.length - 1]!,
          labels: {},
          count: nums.length,
          sum: nums.reduce((a, b) => a + b, 0),
          min: nums[0],
          max: nums[nums.length - 1],
          avg: nums.reduce((a, b) => a + b, 0) / nums.length,
        })
      }
    }

    return snapshots
  }

  /**
   * Reset all metrics.
   */
  reset(): void {
    this.counters.clear()
    this.gauges.clear()
    for (const store of this.metrics.values()) {
      store.values.length = 0
    }
  }

  private recordValue(name: string, value: number, labels: Record<string, string>): void {
    const store = this.metrics.get(name)
    if (!store) return
    store.values.push({
      name,
      value,
      labels,
      timestamp: new Date().toISOString() as any,
    })
  }

  private makeKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels).sort().map(([k, v]) => `${k}=${v}`).join(",")
    return labelStr ? `${name}{${labelStr}}` : name
  }
}

// ---------------------------------------------------------------------------
// Default Metrics
// ---------------------------------------------------------------------------

export const DEFAULT_METRICS: MetricDefinition[] = [
  { name: "workers_active", kind: "gauge", description: "Number of active workers", unit: "count", labels: [] },
  { name: "workers_spawned_total", kind: "counter", description: "Total workers spawned", unit: "count", labels: ["role"] },
  { name: "workers_failed_total", kind: "counter", description: "Total workers failed", unit: "count", labels: ["reason"] },
  { name: "sessions_active", kind: "gauge", description: "Number of active sessions", unit: "count", labels: [] },
  { name: "artifacts_created_total", kind: "counter", description: "Total artifacts created", unit: "count", labels: ["kind"] },
  { name: "artifacts_merged_total", kind: "counter", description: "Total artifacts merged", unit: "count", labels: [] },
  { name: "workflow_runs_active", kind: "gauge", description: "Active workflow runs", unit: "count", labels: [] },
  { name: "tool_invocations_total", kind: "counter", description: "Total tool invocations", unit: "count", labels: ["tool"] },
  { name: "provider_calls_total", kind: "counter", description: "Total provider API calls", unit: "count", labels: ["provider", "model"] },
  { name: "provider_latency_ms", kind: "histogram", description: "Provider call latency", unit: "ms", labels: ["provider", "model"] },
  { name: "tokens_total", kind: "counter", description: "Total tokens consumed", unit: "tokens", labels: ["provider", "model", "direction"] },
  { name: "cost_usd_total", kind: "counter", description: "Total cost in USD", unit: "usd", labels: ["provider", "model"] },
  { name: "memory_stored_total", kind: "gauge", description: "Memory entries stored", unit: "count", labels: ["kind"] },
  { name: "errors_total", kind: "counter", description: "Total errors", unit: "count", labels: ["kind"] },
  { name: "eventbus_events_total", kind: "counter", description: "Total EventBus events", unit: "count", labels: ["event_type"] },
]
