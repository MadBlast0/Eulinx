/**
 * P05-SCHEDULER — Barrel Export
 */

export {
  type SchedulingUnitKind,
  type SchedulingState,
  type SchedulingPriority,
  type SchedulingUnit,
  type SchedulingDependency,
  type DependencyType,
  type ReadinessBlocker,
  type BlockerKind,
  type ReadinessResult,
  type SafetyGateResult,
  type SafetyGateKind,
  type BudgetEstimate,
  type BudgetConfidence,
  type BudgetReservation,
  type RetryPolicy,
  type BackoffStrategy,
  type FailureCategory,
  type QueueKind,
  type ConcurrencyPolicy,
  type SchedulerQueueSnapshot,
  type QueueSnapshotEntry,
  PRIORITY_NUMERIC,
  DEFAULT_RETRY_POLICY,
} from "./scheduler-types"

export { MinHeap, JobQueue } from "./queue"

export {
  evaluateReadiness,
  partitionByReadiness,
  blockerToWaitQueue,
  createDefaultReadinessContext,
  type ReadinessContext,
} from "./readiness"

export {
  computeAgedPriority,
  computeFairnessScore,
  RoundRobinDistributor,
  ConcurrencyTracker,
  type FairnessConfig,
  DEFAULT_FAIRNESS_CONFIG,
} from "./fairness"

export {
  TokenBucket,
  RateLimiter,
  type TokenBucketConfig,
  type TokenBucketState,
  type RateLimitConfig,
} from "./rate-limiter"

export {
  BudgetPool,
  UNLIMITED_BUDGET_POOL,
  type BudgetPoolConfig,
  type BudgetConsumption,
} from "./budgets"

export {
  RetryQueue,
  type RetryEntry,
} from "./retries"

export {
  DeadQueue,
  type DeadEntry,
} from "./dead-queue"

export {
  ConcurrencyLimiter,
  type ConcurrencyConfig,
} from "./concurrency"

export {
  SchedulerEventEmitter,
  type SchedulerEvent,
  type SchedulerEventType,
  type SchedulerEventHandler,
  type SchedulerStartedPayload,
  type SchedulerStoppedPayload,
  type SchedulerPausedPayload,
  type SchedulerResumedPayload,
  type SchedulerUnitEventPayload,
  type SchedulerUnitBlockedPayload,
  type SchedulerUnitUnblockedPayload,
  type SchedulerUnitCompletedPayload,
  type SchedulerUnitFailedPayload,
  type SchedulerUnitCancelledPayload,
  type SchedulerUnitRetryScheduledPayload,
  type SchedulerBudgetExhaustedPayload,
  type SchedulerLockWaitingPayload,
  type SchedulerPermissionWaitingPayload,
} from "./scheduler-events"

export {
  MetricsCollector,
  buildQueueSnapshot,
  type SchedulerMetrics,
} from "./metrics"

export {
  Scheduler,
  type SchedulerConfig,
  type SchedulerLifecycleState,
  DEFAULT_SCHEDULER_CONFIG,
} from "./scheduler"
