/**
 * P14-SEC-PERMISSION — Permission Manager
 *
 * Deterministic runtime service for authorization decisions.
 * From PermissionManager-Part01 through Part06.
 */

import type {
  PermissionRequest,
  PermissionDecision,
  PermissionGrant,
  PermissionPolicy,
  AuditEvent,
  DecisionType,
  RiskLevel,
} from "./security-types"
import { PolicyEngine } from "./policy-engine"
import { AuditLog } from "./audit-log"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

// ---------------------------------------------------------------------------
// Permission Manager
// ---------------------------------------------------------------------------

export class PermissionManager {
  private readonly logger: Logger
  private readonly policyEngine: PolicyEngine
  private readonly auditLog: AuditLog
  private readonly grants = new Map<string, PermissionGrant>()
  private approvalMode: import("./security-types").ApprovalMode = "ask_for_high_risk"

  constructor() {
    this.logger = createLogger("PermissionManager")
    this.policyEngine = new PolicyEngine()
    this.auditLog = new AuditLog()
  }

  // -----------------------------------------------------------------------
  // Core API
  // -----------------------------------------------------------------------

  /** Evaluate a permission request */
  evaluate(request: PermissionRequest): PermissionDecision {
    // 1. Load applicable policies
    const policies = this.policyEngine.getPoliciesForScope(
      request.workspaceId,
      request.projectId,
    )

    // 2. Check for hard denies first
    for (const policy of policies) {
      const deny = this.policyEngine.checkHardDeny(policy, request)
      if (deny) {
        const decision = this.makeDecision(request, "deny", deny, policy.id)
        this.recordDecision(decision)
        return decision
      }
    }

    // 3. Check existing grants
    const grant = this.findMatchingGrant(request)
    if (grant) {
      if (this.isGrantExpired(grant)) {
        const decision = this.makeDecision(request, "expired", "Grant has expired")
        this.recordDecision(decision)
        return decision
      }
      const decision = this.makeDecision(request, "allow", "Matching grant found", undefined, grant.id)
      this.recordDecision(decision)
      return decision
    }

    // 4. Classify risk and check approval requirements
    const riskLevel = request.riskLevel
    const requiresApproval = this.requiresApproval(riskLevel, request)

    if (requiresApproval) {
      const decision = this.makeDecision(request, "require_approval", `Risk level ${riskLevel} requires approval`)
      this.recordDecision(decision)
      return decision
    }

    // 5. Check if auto-allow based on approval mode
    if (this.canAutoAllow(riskLevel)) {
      const decision = this.makeDecision(request, "allow", `Auto-allowed for ${riskLevel} risk`)
      this.recordDecision(decision)
      return decision
    }

    // 6. Default deny
    const decision = this.makeDecision(request, "deny", "No matching policy or grant")
    this.recordDecision(decision)
    return decision
  }

  /** Create a permission grant */
  grant(grant: PermissionGrant): void {
    this.grants.set(grant.id, grant)
    this.auditLog.record({
      id: `audit-${Date.now()}`,
      type: "permission.granted",
      requestId: grant.id,
      actorId: grant.actorId,
      actorType: grant.actorType,
      action: grant.actions[0] ?? "read",
      resourceType: grant.resourceTypes[0] ?? "filesystem",
      decision: "allow",
      reason: grant.reason ?? "Grant created",
      timestamp: new Date().toISOString(),
    })
    this.logger.info(`Grant created: ${grant.id}`)
  }

  /** Revoke a permission grant */
  revoke(grantId: string, reason?: string): boolean {
    const grant = this.grants.get(grantId)
    if (!grant) return false

    const revokedGrant: PermissionGrant = {
      ...grant,
      revokedAt: new Date().toISOString(),
    }
    this.grants.set(grantId, revokedGrant)

    this.auditLog.record({
      id: `audit-${Date.now()}`,
      type: "permission.revoked",
      requestId: grantId,
      actorId: grant.actorId,
      actorType: grant.actorType,
      action: grant.actions[0] ?? "read",
      resourceType: grant.resourceTypes[0] ?? "filesystem",
      decision: "deny",
      reason: reason ?? "Grant revoked",
      timestamp: new Date().toISOString(),
    })

    this.logger.info(`Grant revoked: ${grantId}`)
    return true
  }

  // -----------------------------------------------------------------------
  // Policy Management
  // -----------------------------------------------------------------------

  /** Add a policy */
  addPolicy(policy: PermissionPolicy): void {
    this.policyEngine.addPolicy(policy)
  }

  /** Remove a policy */
  removePolicy(policyId: string): boolean {
    return this.policyEngine.removePolicy(policyId)
  }

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  /** Set approval mode */
  setApprovalMode(mode: import("./security-types").ApprovalMode): void {
    this.approvalMode = mode
    this.logger.info(`Approval mode set to: ${mode}`)
  }

  /** Get approval mode */
  getApprovalMode(): import("./security-types").ApprovalMode {
    return this.approvalMode
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  /** Get audit log */
  getAuditLog(limit?: number): readonly AuditEvent[] {
    return this.auditLog.getEvents(limit)
  }

  /** Get grants for an actor */
  getGrantsForActor(actorId: string): readonly PermissionGrant[] {
    return Array.from(this.grants.values()).filter(
      (g) => g.actorId === actorId && !g.revokedAt,
    )
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private findMatchingGrant(request: PermissionRequest): PermissionGrant | undefined {
    return Array.from(this.grants.values()).find((grant) => {
      if (grant.revokedAt) return false
      if (grant.actorId !== request.actorId) return false
      if (grant.workspaceId !== request.workspaceId) return false
      if (grant.actions.length > 0 && !grant.actions.includes(request.action)) return false
      if (grant.resourceTypes.length > 0 && !grant.resourceTypes.includes(request.resourceType)) return false
      return true
    })
  }

  private isGrantExpired(grant: PermissionGrant): boolean {
    if (grant.revokedAt) return true
    if (grant.expiresAt && new Date(grant.expiresAt) < new Date()) return true
    return false
  }

  private requiresApproval(riskLevel: RiskLevel, _request: PermissionRequest): boolean {
    switch (this.approvalMode) {
      case "ask_every_time":
        return true
      case "ask_for_high_risk":
        return riskLevel === "high" || riskLevel === "critical"
      case "auto_allow_low_risk":
        return riskLevel === "high" || riskLevel === "critical"
      case "deny_by_default":
        return true
      case "yolo_session":
      case "yolo_workspace":
        return riskLevel === "critical"
      case "simulation_only":
        return true
      default:
        return riskLevel !== "low"
    }
  }

  private canAutoAllow(riskLevel: RiskLevel): boolean {
    switch (this.approvalMode) {
      case "ask_for_high_risk":
        return riskLevel === "low" || riskLevel === "medium"
      case "auto_allow_low_risk":
        return riskLevel === "low"
      case "yolo_session":
      case "yolo_workspace":
        return riskLevel !== "critical"
      default:
        return false
    }
  }

  private makeDecision(
    request: PermissionRequest,
    decision: DecisionType,
    reason: string,
    policyId?: string,
    grantId?: string,
  ): PermissionDecision {
    return {
      requestId: request.requestId,
      decision,
      reason,
      policyId,
      grantId,
      approvalRequired: decision === "require_approval",
      evaluatedAt: new Date().toISOString(),
    }
  }

  private recordDecision(decision: PermissionDecision): void {
    this.auditLog.record({
      id: `audit-${Date.now()}`,
      type: "permission.decided",
      requestId: decision.requestId,
      actorId: "",
      actorType: "worker",
      action: "read",
      resourceType: "filesystem",
      decision: decision.decision,
      reason: decision.reason,
      timestamp: decision.evaluatedAt,
    })
  }
}
