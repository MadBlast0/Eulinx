/**
 * P08-WORKER-BASE — Worker Core Types
 *
 * Types for the Worker System from Worker-Part01 through Part06,
 * WorkerHierarchy-Part01 through Part06, WorkerCommunication-Part01 through Part08,
 * WorkerMonitoring-Part01 through Part05, WorkerMetrics-Part01 through Part05.
 */

import type { SessionId, WorkspaceId, WorkerId, IsoTimestamp } from "@/core/types"
import type { WorkerState, WorkerHealth } from "@/spawner/worker-state"

// ---------------------------------------------------------------------------
// Worker Base Object (Worker-Part01 §Object Model)
// ---------------------------------------------------------------------------

export interface WorkerBase {
  readonly workerId: WorkerId
  readonly workspaceId: WorkspaceId
  readonly sessionId: SessionId
  readonly projectId: string
  readonly roleId: string
  readonly displayName: string
  readonly state: WorkerState
  readonly health: WorkerHealth
  readonly parentWorkerId?: WorkerId
  readonly orchestratorId?: string
  readonly taskId?: string
  readonly depth: number
  readonly lineage: readonly WorkerId[]
  readonly createdAt: IsoTimestamp
  readonly updatedAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Hierarchy Node (WorkerHierarchy-Part01 §HierarchyObjectModel)
// ---------------------------------------------------------------------------

export type HierarchyNodeId = string
export type HierarchyNodeKind = "user" | "orchestrator" | "worker"

export type HierarchyNodeState =
  | "pending"
  | "admitted"
  | "running"
  | "paused"
  | "completing"
  | "completed"
  | "cancelled"
  | "failed"
  | "orphaned"

export interface HierarchyNode {
  readonly id: HierarchyNodeId
  readonly kind: HierarchyNodeKind
  readonly sessionId: SessionId
  readonly workspaceId: WorkspaceId
  readonly projectId: string
  readonly parentId: HierarchyNodeId | null
  readonly childIds: readonly HierarchyNodeId[]
  readonly depth: number
  readonly path: string
  readonly actorId: WorkerId | null
  readonly state: HierarchyNodeState
  readonly scope: DelegatedScope
  readonly permissions: PermissionSet
  readonly budget: BudgetAllocation
  readonly limits: NodeLimits
  readonly result: NodeResult | null
  readonly createdAt: IsoTimestamp
  readonly updatedAt: IsoTimestamp
  readonly terminatedAt?: IsoTimestamp
}

export interface NodeLimits {
  readonly maxDepth: number
  readonly maxDirectChildren: number
  readonly maxDescendants: number
  readonly maxConcurrentRunningChildren: number
}

export interface DelegatedScope {
  readonly objective: string
  readonly allowedPaths: readonly string[]
  readonly deniedPaths: readonly string[]
  readonly allowedToolIds: readonly string[]
  readonly deadlineAt?: IsoTimestamp
}

export interface NodeResult {
  readonly outcome: "success" | "partial" | "failure" | "cancelled"
  readonly summary: string
  readonly artifactIds: readonly string[]
  readonly producedAt: IsoTimestamp
}

export interface PermissionSet {
  readonly grants: readonly PermissionGrant[]
}

export interface PermissionGrant {
  readonly capability: string
  readonly scope: {
    readonly paths?: readonly string[]
    readonly hosts?: readonly string[]
    readonly toolIds?: readonly string[]
  }
  readonly constraints: readonly PermissionConstraint[]
}

export type PermissionConstraint =
  | { readonly kind: "max_invocations"; readonly value: number }
  | { readonly kind: "requires_approval" }
  | { readonly kind: "read_only" }

export interface BudgetAllocation {
  readonly allocated: number
  readonly spent: number
  readonly currency: string
}

// ---------------------------------------------------------------------------
// Worker Metrics (WorkerMetrics-Part01 §WorkerMetric)
// ---------------------------------------------------------------------------

export type MetricCategory =
  | "runtime"
  | "cost"
  | "tokens"
  | "resource"
  | "quality"
  | "reliability"
  | "artifact"
  | "permission"
  | "communication"

export interface WorkerMetric {
  readonly id: string
  readonly workerId: WorkerId
  readonly workspaceId: WorkspaceId
  readonly metricName: string
  readonly metricValue: number
  readonly unit: string
  readonly category: MetricCategory
  readonly recordedAt: IsoTimestamp
}

export interface WorkerMetricsSummary {
  readonly workerId: WorkerId
  readonly totalTokensUsed: number
  readonly totalCostMicroUsd: number
  readonly totalToolCalls: number
  readonly totalWallClockMs: number
  readonly totalArtifactsProduced: number
  readonly errorCount: number
  readonly retryCount: number
  readonly lastActivityAt?: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Worker Health States (WorkerMonitoring-Part01 §WorkerHealthStates)
// ---------------------------------------------------------------------------

export type WorkerMonitoringHealth =
  | "healthy"
  | "busy"
  | "waiting"
  | "blocked"
  | "stalled"
  | "unsafe"
  | "failed"
  | "terminated"

export interface HealthCheckResult {
  readonly workerId: WorkerId
  readonly health: WorkerMonitoringHealth
  readonly details: string
  readonly checkedAt: IsoTimestamp
  readonly missedHeartbeats: number
  readonly stallDurationMs?: number
}

// ---------------------------------------------------------------------------
// Worker Pool (WorkerHierarchy-Part06 §Pools)
// ---------------------------------------------------------------------------

export interface WorkerPoolConfig {
  readonly poolId: string
  readonly roleId: string
  readonly minSize: number
  readonly maxSize: number
  readonly scaleUpThreshold: number
  readonly scaleDownThreshold: number
  readonly cooldownMs: number
}

export interface WorkerPool {
  readonly poolId: string
  readonly roleId: string
  readonly workerIds: readonly WorkerId[]
  readonly config: WorkerPoolConfig
  readonly createdAt: IsoTimestamp
  readonly lastScaledAt?: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Worker Capabilities (WorkerHierarchy-Part06 §Capabilities)
// ---------------------------------------------------------------------------

export interface WorkerCapabilities {
  readonly canSpawnChildren: boolean
  readonly canAccessNetwork: boolean
  readonly canWriteFiles: boolean
  readonly canDeleteFiles: boolean
  readonly canExecuteCommands: boolean
  readonly canAccessBrowser: boolean
  readonly canUseDatabase: boolean
  readonly canUseDocker: boolean
  readonly toolIds: readonly string[]
}
