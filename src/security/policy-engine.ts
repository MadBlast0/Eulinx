/**
 * P14-SEC-POLICY — Policy Engine
 *
 * Evaluates permission policies with deterministic precedence.
 * From PermissionManager-Part02: policy layers and evaluation pipeline.
 */

import type {
  PermissionPolicy,
  PermissionRequest,
  PolicyRule,
} from "./security-types"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

// ---------------------------------------------------------------------------
// Policy Engine
// ---------------------------------------------------------------------------

export class PolicyEngine {
  private readonly logger: Logger
  private readonly policies = new Map<string, PermissionPolicy>()

  constructor() {
    this.logger = createLogger("PolicyEngine")
  }

  /** Add a policy */
  addPolicy(policy: PermissionPolicy): void {
    this.policies.set(policy.id, policy)
    this.logger.info(`Policy added: ${policy.id}`)
  }

  /** Remove a policy */
  removePolicy(policyId: string): boolean {
    const result = this.policies.delete(policyId)
    if (result) {
      this.logger.info(`Policy removed: ${policyId}`)
    }
    return result
  }

  /** Get policies for a scope */
  getPoliciesForScope(
    workspaceId: string,
    projectId?: string,
  ): readonly PermissionPolicy[] {
    return Array.from(this.policies.values())
      .filter((p) => p.enabled)
      .filter((p) => {
        if (p.scope === "application") return true
        if (p.scope === "workspace" && p.scopeId === workspaceId) return true
        if (p.scope === "project" && p.scopeId === projectId) return true
        return false
      })
      .sort((a, b) => b.priority - a.priority)
  }

  /** Check if a policy has a hard deny for the request */
  checkHardDeny(
    policy: PermissionPolicy,
    request: PermissionRequest,
  ): string | undefined {
    for (const rule of policy.rules) {
      if (this.ruleMatches(rule, request) && rule.decision === "deny") {
        return rule.reason ?? `Denied by policy ${policy.id}`
      }
    }
    return undefined
  }

  /** Evaluate all policies and return the decision */
  evaluate(
    policies: readonly PermissionPolicy[],
    request: PermissionRequest,
  ): { decision: "allow" | "deny"; reason: string; policyId?: string } {
    // Check hard denies first
    for (const policy of policies) {
      const deny = this.checkHardDeny(policy, request)
      if (deny) {
        return { decision: "deny", reason: deny, policyId: policy.id }
      }
    }

    // Check allows
    for (const policy of policies) {
      for (const rule of policy.rules) {
        if (this.ruleMatches(rule, request) && rule.decision === "allow") {
          return {
            decision: "allow",
            reason: rule.reason ?? `Allowed by policy ${policy.id}`,
            policyId: policy.id,
          }
        }
      }
    }

    // Default deny
    return { decision: "deny", reason: "No matching allow rule" }
  }

  /** Check if a rule matches a request */
  private ruleMatches(rule: PolicyRule, request: PermissionRequest): boolean {
    // Check action
    if (rule.action !== "*" && rule.action !== request.action) return false

    // Check resource type
    if (rule.resourceType !== "*" && rule.resourceType !== request.resourceType) return false

    // Check risk limit
    if (rule.riskLimit) {
      const riskOrder = ["low", "medium", "high", "critical"]
      const requestRisk = riskOrder.indexOf(request.riskLevel)
      const limitRisk = riskOrder.indexOf(rule.riskLimit)
      if (requestRisk > limitRisk) return false
    }

    // Check conditions
    if (rule.conditions) {
      for (const [_key, value] of Object.entries(rule.conditions)) {
        if (request.resourceId !== value) return false
      }
    }

    return true
  }

  /** List all policies */
  listPolicies(): readonly PermissionPolicy[] {
    return Array.from(this.policies.values())
  }

  /** Get a policy by ID */
  getPolicy(id: string): PermissionPolicy | undefined {
    return this.policies.get(id)
  }
}
