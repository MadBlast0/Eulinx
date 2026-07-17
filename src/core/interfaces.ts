/**
 * P01-CORE-INTERFACES — Service Contracts
 *
 * Canonical service interfaces from ServiceAPI-Part01.
 * Each runtime service exposes a trait; callers depend on the trait, not internals.
 */

import type {
  WorkerId,
  TaskId,
  ArtifactId,
  SessionId,
  WorkspaceId,
  LockId,
  RunId,
  GraphNodeId,
  GraphEdgeId,
  PluginId,
  ProviderId,
  McpServerId,
  SettingKey,
} from "./types"
import type {
  RunState,
  TaskStatus,
  LockScope,
  RefinementMode,
  SessionKind,
  SettingScope,
  Health,
  GraphNodeKind,
  GraphEdgeKind,
  MemoryKind,
  Verifier,
  PluginState,
  ProviderStatus,
  ArtifactKind,
} from "./enums"
import type { JsonValue, IsoTimestamp, Percentage } from "./types"
import type { Finding } from "./error"

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export interface WorkerSummary {
  readonly id: WorkerId
  readonly state: RunState
  readonly parentId?: WorkerId
  readonly createdAt: IsoTimestamp
  readonly refinementMode: RefinementMode
  readonly progress?: Percentage
  readonly taskId?: TaskId
}

export interface WorkerDetail extends WorkerSummary {
  readonly workspaceId: WorkspaceId
  readonly prompt?: string
  readonly sessionId?: SessionId
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export interface TaskSummary {
  readonly id: TaskId
  readonly title: string
  readonly status: TaskStatus
  readonly ownerWorkerId?: WorkerId
  readonly progress?: Percentage
  readonly createdAt: IsoTimestamp
}

export interface TaskDetail extends TaskSummary {
  readonly description: string
  readonly parentId?: TaskId
  readonly workspaceId: WorkspaceId
}

// ---------------------------------------------------------------------------
// Artifact
// ---------------------------------------------------------------------------

export interface ArtifactSummary {
  readonly id: ArtifactId
  readonly kind: ArtifactKind
  readonly title: string
  readonly createdAt: IsoTimestamp
}

export interface ArtifactDetail extends ArtifactSummary {
  readonly workspaceId: WorkspaceId
  readonly contentHash: string
  readonly version: number
  readonly parentVersion?: ArtifactId
}

export interface ArtifactRef {
  readonly artifactId: ArtifactId
  readonly kind: ArtifactKind
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

export interface MergeReceipt {
  readonly accepted: boolean
  readonly conflictIds?: readonly string[]
  readonly mergedAt?: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export interface VerificationResult {
  readonly passed: boolean
  readonly findings: readonly Finding[]
  readonly verifier: Verifier
}

// ---------------------------------------------------------------------------
// Lock
// ---------------------------------------------------------------------------

export interface LockGrant {
  readonly granted: boolean
  readonly owner?: WorkerId
  readonly waiters: number
}

export interface LockState {
  readonly id: LockId
  readonly resource: string
  readonly owner: WorkerId
  readonly scope: LockScope
  readonly acquiredAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export interface MemoryHit {
  readonly id: string
  readonly channel?: string
  readonly content: string
  readonly kind: MemoryKind
  readonly score: number
}

export interface ChannelSummary {
  readonly id: string
  readonly name: string
  readonly entryCount: number
}

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

export interface GraphNode {
  readonly id: GraphNodeId
  readonly kind: GraphNodeKind
  readonly label: string
  readonly position?: { x: number; y: number }
  readonly status?: RunState
}

export interface GraphEdge {
  readonly id: GraphEdgeId
  readonly from: GraphNodeId
  readonly to: GraphNodeId
  readonly kind: GraphEdgeKind
}

export interface GraphState {
  readonly nodes: readonly GraphNode[]
  readonly edges: readonly GraphEdge[]
}

export interface RunReceipt {
  readonly runId: RunId
  readonly startedAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export interface SessionSummary {
  readonly id: SessionId
  readonly kind: SessionKind
  readonly workerId?: WorkerId
  readonly createdAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface SettingValue {
  readonly key: SettingKey
  readonly value: JsonValue
  readonly scope: SettingScope
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ProviderSummary {
  readonly id: ProviderId
  readonly name: string
  readonly status: ProviderStatus
}

export interface ConnectionTest {
  readonly connected: boolean
  readonly latencyMs?: number
  readonly error?: string
}

// ---------------------------------------------------------------------------
// MCP
// ---------------------------------------------------------------------------

export interface McpServerSummary {
  readonly id: McpServerId
  readonly name: string
  readonly enabled: boolean
  readonly health: Health
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export interface PluginSummary {
  readonly id: PluginId
  readonly name: string
  readonly state: PluginState
}

export interface PluginOutput {
  readonly data: JsonValue
  readonly truncated?: boolean
}

// ---------------------------------------------------------------------------
// Filesystem
// ---------------------------------------------------------------------------

export interface FileContent {
  readonly path: string
  readonly content: string
  readonly truncatedBytes?: number
}

export interface FileEntry {
  readonly name: string
  readonly path: string
  readonly isDirectory: boolean
  readonly size?: number
  readonly modifiedAt?: IsoTimestamp
}

export interface WatchHandle {
  readonly watchId: string
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

export type WindowTheme = "light" | "dark" | "system"

// ---------------------------------------------------------------------------
// Unit
// ---------------------------------------------------------------------------

export type Unit = null
