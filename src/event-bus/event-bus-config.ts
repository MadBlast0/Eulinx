/**
 * P03-EVENT-BUS — EventBus Configuration and Metrics
 *
 * Config from EventBus-Part01 §Object Model and Part-04 §Batching.
 * Metrics from EventBus-Part01 §Object Model and Part-05 §Metrics Taps.
 */

import type { IsoTimestamp } from "@/core/types"

// ---------------------------------------------------------------------------
// EventBus states (EventBus-Part01 §EventBus States)
// ---------------------------------------------------------------------------

export type EventBusState =
  | "uninitialized"
  | "starting"
  | "ready"
  | "running"
  | "degraded"
  | "draining"
  | "stopped"
  | "failed"

// ---------------------------------------------------------------------------
// EventBus configuration (EventBus-Part01 + Part-04)
// ---------------------------------------------------------------------------

export type EventBusConfig = {
  /** Max events in the core subscriber queue */
  readonly coreQueueCapacity: number
  /** Max events in the plugin subscriber queue */
  readonly pluginQueueCapacity: number
  /** UI batch flush interval in ms (default 50) */
  readonly uiBatchIntervalMs: number
  /** Max events per UI batch before forced flush */
  readonly uiBatchMaxSize: number
  /** Timeout for slow core subscriber before marking lagging */
  readonly slowSubscriberTimeoutMs: number
  /** Days to retain replay-grade events */
  readonly logRetentionDays: number
  /** Max bytes for the event log */
  readonly logMaxBytes: number
  /** Max payload size in bytes (256 KiB) */
  readonly maxPayloadBytes: number
  /** Max consecutive panics before quarantine (plugin) or fatal (core) */
  readonly maxConsecutivePanics: number
  /** Time window for source rate limiting (ms) */
  readonly rateLimitWindowMs: number
  /** Max events per source per rate limit window (non-replay-grade) */
  readonly rateLimitMaxEvents: number
  /** Coalesced output chunk max bytes */
  readonly coalescedChunkMaxBytes: number
}

export const DEFAULT_EVENT_BUS_CONFIG: EventBusConfig = {
  coreQueueCapacity: 10_000,
  pluginQueueCapacity: 1_024,
  uiBatchIntervalMs: 50,
  uiBatchMaxSize: 200,
  slowSubscriberTimeoutMs: 5_000,
  logRetentionDays: 30,
  logMaxBytes: 2 * 1024 * 1024 * 1024, // 2 GiB
  maxPayloadBytes: 256 * 1024, // 256 KiB
  maxConsecutivePanics: 3,
  rateLimitWindowMs: 2_000,
  rateLimitMaxEvents: 100,
  coalescedChunkMaxBytes: 64 * 1024, // 64 KiB
}

// ---------------------------------------------------------------------------
// EventBus metrics (EventBus-Part01 §Object Model)
// ---------------------------------------------------------------------------

export type EventBusMetrics = {
  readonly published: number
  readonly delivered: number
  readonly dropped: number
  readonly coreQueueDepth: number
  readonly pluginQueueDepth: number
  readonly slowSubscribers: number
  readonly maxLagMs: number
}

export function createInitialMetrics(): EventBusMetrics {
  return {
    published: 0,
    delivered: 0,
    dropped: 0,
    coreQueueDepth: 0,
    pluginQueueDepth: 0,
    slowSubscribers: 0,
    maxLagMs: 0,
  }
}

// ---------------------------------------------------------------------------
// Runtime metrics snapshot (EventBus-Part05 §Metrics Taps)
// ---------------------------------------------------------------------------

export type RuntimeMetricsSnapshot = {
  readonly workersSpawned: number
  readonly workersActive: number
  readonly executionsCompleted: number
  readonly executionsFailed: number
  readonly artifactsCreated: number
  readonly artifactsRejected: number
  readonly mergesApplied: number
  readonly mergesRolledBack: number
  readonly permissionsDenied: number
  readonly locksContended: number
  readonly lockWaitP95Ms: number
  readonly toolInvocations: number
  readonly toolFailureRate: number
  readonly totalCostMicroUsd: number
  readonly busPublishRate: number
  readonly busDroppedEvents: number
  readonly capturedAt: IsoTimestamp
}
