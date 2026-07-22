/**
 * P14-SEC-PERMISSION — Security Types
 *
 * Types for the security system: permissions, policies, grants, approvals.
 * From PermissionManager-Part01 through Part06.
 */

import type { WorkerId, SessionId, WorkspaceId } from "@/core/types"

// ---------------------------------------------------------------------------
// Actor Types
// ---------------------------------------------------------------------------

export type ActorType = "worker" | "tool" | "workflow" | "plugin" | "mcp" | "cli" | "user"

// ---------------------------------------------------------------------------
// Risk Level
// ---------------------------------------------------------------------------

export type RiskLevel = "low" | "medium" | "high" | "critical"

// ---------------------------------------------------------------------------
// Permission Action
// ---------------------------------------------------------------------------

export type PermissionAction =
  | "read"
  | "write"
  | "delete"
  | "execute"
  | "network"
  | "secrets"
  | "git"
  | "spawn"
  | "merge"
  | "approve"

// ---------------------------------------------------------------------------
// Resource Type
// ---------------------------------------------------------------------------

export type ResourceType =
  | "filesystem"
  | "terminal"
  | "network"
  | "database"
  | "git"
  | "worker"
  | "session"
  | "artifact"
  | "memory"
  | "secret"
  | "tool"
  | "plugin"

// ---------------------------------------------------------------------------
// Permission Request
// ---------------------------------------------------------------------------

export interface PermissionRequest {
  readonly requestId: string
  readonly actorId: string
  readonly actorType: ActorType
  readonly workspaceId: WorkspaceId
  readonly projectId?: string
  readonly sessionId?: SessionId
  readonly action: PermissionAction
  readonly resourceType: ResourceType
  readonly resourceId?: string
  readonly riskLevel: RiskLevel
  readonly reason?: string
  readonly requestedAt: string
  readonly workerId?: WorkerId
  readonly toolId?: string
  readonly commandPreview?: string
  readonly affectedPaths?: readonly string[]
}

// ---------------------------------------------------------------------------
// Permission Decision
// ---------------------------------------------------------------------------

export type DecisionType = "allow" | "deny" | "require_approval" | "defer" | "expired" | "invalid_scope"

export interface PermissionDecision {
  readonly requestId: string
  readonly decision: DecisionType
  readonly reason: string
  readonly policyId?: string
  readonly grantId?: string
  readonly approvalRequired?: boolean
  readonly evaluatedAt: string
}

// ---------------------------------------------------------------------------
// Permission Grant
// ---------------------------------------------------------------------------

export type GrantExpiry =
  | "single_action"
  | "single_task"
  | "single_worker"
  | "single_session"
  | "time_limited"
  | "until_workspace_close"

export interface PermissionGrant {
  readonly id: string
  readonly actorId: string
  readonly actorType: ActorType
  readonly workspaceId: WorkspaceId
  readonly projectId?: string
  readonly sessionId?: SessionId
  readonly actions: readonly PermissionAction[]
  readonly resourceTypes: readonly ResourceType[]
  readonly riskLimit: RiskLevel
  readonly createdBy: string
  readonly createdAt: string
  readonly expiresAt?: string
  readonly revokedAt?: string
  readonly reason?: string
  readonly expiryType: GrantExpiry
}

// ---------------------------------------------------------------------------
// Approval Mode
// ---------------------------------------------------------------------------

export type ApprovalMode =
  | "ask_every_time"
  | "ask_for_high_risk"
  | "auto_allow_low_risk"
  | "yolo_session"
  | "yolo_workspace"
  | "deny_by_default"
  | "simulation_only"

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export type PolicyScope = "application" | "workspace" | "project" | "session" | "worker" | "tool"

export interface PermissionPolicy {
  readonly id: string
  readonly name: string
  readonly scope: PolicyScope
  readonly scopeId?: string
  readonly rules: readonly PolicyRule[]
  readonly priority: number
  readonly enabled: boolean
  readonly createdAt: string
}

export interface PolicyRule {
  readonly action: PermissionAction | "*"
  readonly resourceType: ResourceType | "*"
  readonly decision: DecisionType
  readonly riskLimit?: RiskLevel
  readonly reason?: string
  readonly conditions?: Readonly<Record<string, string>>
}

// ---------------------------------------------------------------------------
// Audit Event
// ---------------------------------------------------------------------------

export interface AuditEvent {
  readonly id: string
  readonly type: "permission.decided" | "permission.granted" | "permission.revoked" | "permission.approval_requested" | "permission.approval_resolved"
  readonly requestId: string
  readonly actorId: string
  readonly actorType: ActorType
  readonly action: PermissionAction
  readonly resourceType: ResourceType
  readonly decision: DecisionType
  readonly reason: string
  readonly timestamp: string
  readonly metadata?: Readonly<Record<string, unknown>>
}

// ---------------------------------------------------------------------------
// Secret
// ---------------------------------------------------------------------------

export interface SecretEntry {
  readonly id: string
  readonly name: string
  readonly value: string
  readonly workspaceId?: WorkspaceId
  readonly projectId?: string
  readonly createdAt: string
  readonly expiresAt?: string
  readonly lastAccessedAt?: string
}
