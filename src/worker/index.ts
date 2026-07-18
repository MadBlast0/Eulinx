/**
 * P08-WORKER — Worker System Barrel Export
 */

// Types
export type {
  WorkerBase,
  HierarchyNodeId,
  HierarchyNodeKind,
  HierarchyNodeState,
  HierarchyNode,
  NodeLimits,
  DelegatedScope,
  NodeResult,
  PermissionSet,
  PermissionGrant,
  PermissionConstraint,
  BudgetAllocation,
  MetricCategory,
  WorkerMetric,
  WorkerMetricsSummary,
  WorkerMonitoringHealth,
  HealthCheckResult,
  WorkerPoolConfig,
  WorkerPool,
  WorkerCapabilities,
} from "./worker-types"

// Worker Manager
export type {
  WorkerManagerConfig,
  WorkerManagerEventKind,
  WorkerManagerEvent,
} from "./worker-manager"

export {
  DEFAULT_WORKER_MANAGER_CONFIG,
  WorkerManager,
} from "./worker-manager"

// Worker Hierarchy
export type {
  // Re-use types from worker-types
} from "./worker-hierarchy"

export {
  DEFAULT_NODE_LIMITS,
  WorkerHierarchyManager,
} from "./worker-hierarchy"

// Worker Messaging
export type {
  MessagePriority,
  MessageDirection,
  MessageKind,
  MessageEnvelope,
  TaskAssignmentPayload,
  QuestionPayload,
  AnswerPayload,
  StatusPayload,
  HeartbeatPayload,
  ResultPayload,
  ArtifactReadyPayload,
  ErrorPayload,
  CancelPayload,
  MessageChannel,
  MessageValidationResult,
} from "./worker-messaging"

export {
  WorkerMessageRouter,
} from "./worker-messaging"

// Worker Health
export type {
  HeartbeatConfig,
  HeartbeatRecord,
  StallConfig,
  StallCheckResult,
} from "./worker-health"

export {
  DEFAULT_HEARTBEAT_CONFIG,
  DEFAULT_STALL_CONFIG,
  HeartbeatTracker,
  StallDetector,
  evaluateWorkerHealth,
  WorkerHealthMonitor,
} from "./worker-health"

// Worker Pool
export type {
  PoolScaleDecision,
} from "./worker-pool"

export {
  WorkerPoolManager,
} from "./worker-pool"

// Worker Coordination
export type {
  BarrierState,
  CoordinationBarrier,
  WorkItem,
} from "./worker-coordination"

export {
  WorkerCoordinationManager,
} from "./worker-coordination"
