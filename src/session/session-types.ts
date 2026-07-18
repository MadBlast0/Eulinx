/**
 * P07-SESSION-CREATE — Session Core Types
 *
 * Types for the Session System from Session-Part01 through Part04.
 * Covers session creation, metadata, branching, replay, and context.
 */

import type { SessionId, WorkspaceId, WorkerId, IsoTimestamp } from "@/core/types"

// ---------------------------------------------------------------------------
// Session Creation Request
// ---------------------------------------------------------------------------

export type SessionKind = "chat" | "terminal" | "agent"

export interface SessionCreateRequest {
  readonly workspaceId: WorkspaceId
  readonly runtimeId: string
  readonly kind: SessionKind
  readonly parentSessionId?: SessionId
  readonly branchFromEventSeq?: number
  readonly reason?: string
}

// ---------------------------------------------------------------------------
// Session Handle (returned after creation)
// ---------------------------------------------------------------------------

export interface SessionHandle {
  readonly sessionId: SessionId
  readonly workspaceId: WorkspaceId
  readonly state: string
  readonly createdAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Session Metadata (P07-SESSION-META)
// ---------------------------------------------------------------------------

export interface SessionMetadata {
  readonly sessionId: SessionId
  readonly workspaceId: WorkspaceId
  readonly runtimeId: string
  readonly kind: SessionKind
  readonly displayName?: string
  readonly description?: string
  readonly parentSessionId?: SessionId
  readonly branchPoint?: number
  readonly createdAt: IsoTimestamp
  readonly updatedAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Session Branch (P07-SESSION-BRANCH)
// ---------------------------------------------------------------------------

export interface SessionBranch {
  readonly branchId: string
  readonly sourceSessionId: SessionId
  readonly targetSessionId: SessionId
  readonly forkedAtEventSeq: number
  readonly reason: string
  readonly createdAt: IsoTimestamp
}

export interface BranchCreateRequest {
  readonly sourceSessionId: SessionId
  readonly forkAtEventSeq: number
  readonly reason: string
  readonly kind: SessionKind
}

// ---------------------------------------------------------------------------
// Session Replay (P07-SESSION-REPLAY)
// ---------------------------------------------------------------------------

export type ReplayState = "idle" | "preparing" | "playing" | "paused" | "completed" | "failed"

export interface ReplayTimelineEntry {
  readonly eventSeq: number
  readonly eventType: string
  readonly workerId?: WorkerId
  readonly timestamp: IsoTimestamp
  readonly payload: Record<string, unknown>
}

export interface ReplayConfig {
  readonly sessionId: SessionId
  readonly startEventSeq?: number
  readonly endEventSeq?: number
  readonly speed?: number
  readonly filter?: ReplayFilter
}

export interface ReplayFilter {
  readonly eventTypes?: readonly string[]
  readonly workerIds?: readonly WorkerId[]
}

export interface ReplayResult {
  readonly sessionId: SessionId
  readonly totalEvents: number
  readonly replayedEvents: number
  readonly timeline: readonly ReplayTimelineEntry[]
  readonly startedAt: IsoTimestamp
  readonly completedAt?: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Session Snapshot (P07-SESSION-SNAP)
// ---------------------------------------------------------------------------

export interface SessionSnapshot {
  readonly snapshotId: string
  readonly sessionId: SessionId
  readonly eventSeq: number
  readonly label: string
  readonly workerStates: Readonly<Record<string, unknown>>
  readonly activeWorkerIds: readonly WorkerId[]
  readonly activeTaskIds: readonly string[]
  readonly artifactIds: readonly string[]
  readonly metrics: Record<string, number>
  readonly createdAt: IsoTimestamp
}

export interface SnapshotCreateRequest {
  readonly sessionId: SessionId
  readonly label: string
}

// ---------------------------------------------------------------------------
// Session Context (P07-SESSION-CTX)
// ---------------------------------------------------------------------------

export interface SessionContext {
  readonly sessionId: SessionId
  readonly workspaceId: WorkspaceId
  readonly activeWorkerIds: readonly WorkerId[]
  readonly activeTaskIds: readonly string[]
  readonly recentEvents: readonly SessionContextEvent[]
  readonly metrics: Record<string, number>
}

export interface SessionContextEvent {
  readonly eventSeq: number
  readonly eventType: string
  readonly timestamp: IsoTimestamp
  readonly summary: string
}

// ---------------------------------------------------------------------------
// Session History (P07-SESSION-HISTORY)
// ---------------------------------------------------------------------------

export interface SessionHistoryEntry {
  readonly eventSeq: number
  readonly eventType: string
  readonly actor: string
  readonly timestamp: IsoTimestamp
  readonly detail: string
  readonly metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Session Event Types
// ---------------------------------------------------------------------------

export type SessionEventKind =
  | "session.created"
  | "session.initialized"
  | "session.workspace_loaded"
  | "session.services_started"
  | "session.started"
  | "session.paused"
  | "session.resumed"
  | "session.completing"
  | "session.completed"
  | "session.archived"
  | "session.failed"
  | "session.cancelled"
  | "session.recovering"
  | "session.recovered"
  | "session.worker_added"
  | "session.worker_removed"
  | "session.task_added"
  | "session.task_removed"
  | "session.artifact_added"
  | "session.snapshot_created"
  | "session.branch_created"
  | "session.replay_started"
  | "session.replay_completed"
  | "session.context_built"

export interface SessionEvent {
  readonly kind: SessionEventKind
  readonly sessionId: SessionId
  readonly workspaceId: WorkspaceId
  readonly eventSeq: number
  readonly timestamp: IsoTimestamp
  readonly actor: string
  readonly detail?: string
  readonly metadata?: Record<string, unknown>
}
