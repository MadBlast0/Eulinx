/**
 * P14-SEC-PERMISSION — Security System
 *
 * Permissions, approvals, secrets, sandboxing, isolation, auditing, auth.
 * From PermissionManager-Part01 through Part06.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  ActorType,
  RiskLevel,
  PermissionAction,
  ResourceType,
  PermissionRequest,
  DecisionType,
  PermissionDecision,
  GrantExpiry,
  PermissionGrant,
  ApprovalMode,
  PolicyScope,
  PermissionPolicy,
  PolicyRule,
  AuditEvent,
  SecretEntry,
} from "./security-types"

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

export { PermissionManager } from "./permission-manager"
export { PolicyEngine } from "./policy-engine"
export { AuditLog } from "./audit-log"
export { SecretManager } from "./secret-manager"
