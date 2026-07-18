/**
 * P19-OBS — Observability Types
 *
 * Types for metrics, tracing, profiling, health checks, alerts, analytics,
 * usage tracking, cost tracking, and performance monitoring.
 * From RuntimeManager-Part01 through Part06, CostOptimization-Part01 through Part05.
 */

import type { IsoTimestamp } from "@/core/types"
import type { WorkspaceId } from "@/core/types"

// ---------------------------------------------------------------------------
// Metric Types
// ---------------------------------------------------------------------------

export type MetricKind = "counter" | "gauge" | "histogram" | "summary"

export interface MetricDefinition {
  readonly name: string
  readonly kind: MetricKind
  readonly description: string
  readonly unit: string
  readonly labels: readonly string[]
}

export interface MetricValue {
  readonly name: string
  readonly value: number
  readonly labels: Record<string, string>
  readonly timestamp: IsoTimestamp
}

export interface MetricSnapshot {
  readonly name: string
  readonly kind: MetricKind
  readonly value: number
  readonly labels: Record<string, string>
  readonly count?: number
  readonly sum?: number
  readonly min?: number
  readonly max?: number
  readonly avg?: number
}

// ---------------------------------------------------------------------------
// Trace Types
// ---------------------------------------------------------------------------

export type TraceSpanStatus = "ok" | "error" | "timeout"

export interface TraceSpan {
  readonly traceId: string
  readonly spanId: string
  readonly parentSpanId: string | null
  readonly name: string
  readonly service: string
  readonly operation: string
  readonly startTime: IsoTimestamp
  readonly endTime?: IsoTimestamp
  readonly durationMs?: number
  readonly status: TraceSpanStatus
  readonly attributes: Record<string, string | number | boolean>
  readonly events: TraceEvent[]
}

export interface TraceEvent {
  readonly name: string
  readonly timestamp: IsoTimestamp
  readonly attributes: Record<string, string | number | boolean>
}

// ---------------------------------------------------------------------------
// Profile Types
// ---------------------------------------------------------------------------

export type ProfileEventType = "cpu" | "memory" | "event_loop" | "gc" | "alloc"

export interface ProfileEvent {
  readonly type: ProfileEventType
  readonly timestamp: IsoTimestamp
  readonly durationMs: number
  readonly details: Record<string, unknown>
}

export interface ProfileSession {
  readonly profileId: string
  readonly startTime: IsoTimestamp
  readonly endTime?: IsoTimestamp
  readonly events: ProfileEvent[]
  readonly summary: ProfileSummary
}

export interface ProfileSummary {
  readonly totalDurationMs: number
  readonly cpuTimeMs: number
  readonly memoryPeakBytes: number
  readonly gcCount: number
  readonly gcPauseMs: number
  readonly eventLoopLagMs: number
}

// ---------------------------------------------------------------------------
// Health Types
// ---------------------------------------------------------------------------

export type HealthStatus = "healthy" | "degraded" | "unhealthy"

export interface HealthCheckResult {
  readonly name: string
  readonly status: HealthStatus
  readonly message: string
  readonly durationMs: number
  readonly checkedAt: IsoTimestamp
  readonly details?: Record<string, unknown>
}

export interface HealthSnapshot {
  readonly status: HealthStatus
  readonly checks: readonly HealthCheckResult[]
  readonly uptime: number
  readonly version: string
  readonly nodeVersion: string
  readonly platform: string
  readonly memoryUsage: MemoryUsage
  readonly timestamp: IsoTimestamp
}

export interface MemoryUsage {
  readonly heapUsedBytes: number
  readonly heapTotalBytes: number
  readonly rssBytes: number
  readonly externalBytes: number
}

// ---------------------------------------------------------------------------
// Alert Types
// ---------------------------------------------------------------------------

export type AlertSeverity = "info" | "warning" | "critical"

export type AlertStatus = "active" | "acknowledged" | "resolved"

export interface AlertRule {
  readonly ruleId: string
  readonly name: string
  readonly description: string
  readonly metric: string
  readonly condition: AlertCondition
  readonly threshold: number
  readonly durationMs: number
  readonly severity: AlertSeverity
  readonly enabled: boolean
}

export type AlertCondition =
  | "greater_than"
  | "less_than"
  | "equals"
  | "not_equals"
  | "rate_of_change"

export interface Alert {
  readonly alertId: string
  readonly ruleId: string
  readonly name: string
  readonly severity: AlertSeverity
  readonly status: AlertStatus
  readonly message: string
  readonly value: number
  readonly threshold: number
  readonly triggeredAt: IsoTimestamp
  readonly acknowledgedAt?: IsoTimestamp
  readonly resolvedAt?: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Analytics Types
// ---------------------------------------------------------------------------

export interface UsageEvent {
  readonly eventId: string
  readonly kind: UsageEventKind
  readonly timestamp: IsoTimestamp
  readonly userId?: string
  readonly workspaceId: WorkspaceId
  readonly metadata: Record<string, unknown>
}

export type UsageEventKind =
  | "session_started"
  | "session_ended"
  | "worker_spawned"
  | "worker_completed"
  | "worker_failed"
  | "artifact_created"
  | "artifact_merged"
  | "workflow_started"
  | "workflow_completed"
  | "workflow_failed"
  | "tool_invoked"
  | "provider_called"
  | "memory_written"
  | "error_occurred"

// ---------------------------------------------------------------------------
// Cost Types
// ---------------------------------------------------------------------------

export interface CostEntry {
  readonly entryId: string
  readonly provider: string
  readonly model: string
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cacheReadTokens: number
  readonly cacheWriteTokens: number
  readonly costUsd: number
  readonly latencyMs: number
  readonly timestamp: IsoTimestamp
  readonly workspaceId: WorkspaceId
  readonly workerId?: string
  readonly runId?: string
  readonly kind: CostEntryKind
}

export type CostEntryKind = "chat" | "completion" | "embedding" | "image" | "tool"

export interface CostSummary {
  readonly totalCostUsd: number
  readonly totalTokens: number
  readonly byProvider: Record<string, ProviderCostSummary>
  readonly byModel: Record<string, ModelCostSummary>
  readonly byWorkspace: Record<string, number>
  readonly period: CostPeriod
}

export interface ProviderCostSummary {
  readonly provider: string
  readonly costUsd: number
  readonly tokens: number
  readonly calls: number
}

export interface ModelCostSummary {
  readonly model: string
  readonly provider: string
  readonly costUsd: number
  readonly tokens: number
  readonly calls: number
  readonly avgLatencyMs: number
}

export type CostPeriod = "hour" | "day" | "week" | "month" | "all"

// ---------------------------------------------------------------------------
// Performance Types
// ---------------------------------------------------------------------------

export interface PerformanceMetrics {
  readonly uptime: number
  readonly cpuUsagePercent: number
  readonly memoryUsageMb: number
  readonly eventLoopLagMs: number
  readonly activeHandles: number
  readonly activeRequests: number
  readonly gcPauseMs: number
  readonly heapUsedMb: number
  readonly heapTotalMb: number
  readonly rssMb: number
  readonly timestamp: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Observability Config
// ---------------------------------------------------------------------------

export interface ObservabilityConfig {
  readonly metricsEnabled: boolean
  readonly tracingEnabled: boolean
  readonly profilingEnabled: boolean
  readonly healthCheckIntervalMs: number
  readonly metricsFlushIntervalMs: number
  readonly alertCheckIntervalMs: number
  readonly costTrackingEnabled: boolean
  readonly performanceMonitoringEnabled: boolean
}
