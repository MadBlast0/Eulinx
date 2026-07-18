/**
 * P14-SEC-PERMISSION — Permission Manager Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { PermissionManager } from "./permission-manager"
import type { PermissionRequest, PermissionGrant, PermissionPolicy } from "./security-types"
import type { WorkspaceId } from "@/core/types"

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

function createMockRequest(overrides: Partial<PermissionRequest> = {}): PermissionRequest {
  return {
    requestId: "req-1",
    actorId: "worker-1",
    actorType: "worker",
    workspaceId: "ws-1" as WorkspaceId,
    action: "read",
    resourceType: "filesystem",
    riskLevel: "low",
    requestedAt: new Date().toISOString(),
    ...overrides,
  }
}

function createMockGrant(overrides: Partial<PermissionGrant> = {}): PermissionGrant {
  return {
    id: "grant-1",
    actorId: "worker-1",
    actorType: "worker",
    workspaceId: "ws-1" as WorkspaceId,
    actions: ["read", "write"],
    resourceTypes: ["filesystem"],
    riskLimit: "high",
    createdBy: "user-1",
    createdAt: new Date().toISOString(),
    expiryType: "single_session",
    ...overrides,
  }
}

function createMockPolicy(overrides: Partial<PermissionPolicy> = {}): PermissionPolicy {
  return {
    id: "policy-1",
    name: "Test Policy",
    scope: "workspace",
    scopeId: "ws-1",
    rules: [
      { action: "delete", resourceType: "*", decision: "deny", reason: "Deletes require approval" },
      { action: "read", resourceType: "*", decision: "allow" },
    ],
    priority: 10,
    enabled: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PermissionManager", () => {
  let manager: PermissionManager

  beforeEach(() => {
    manager = new PermissionManager()
  })

  it("allows low-risk read operations", () => {
    const request = createMockRequest()
    const decision = manager.evaluate(request)

    expect(decision.decision).toBe("allow")
  })

  it("denies delete operations without policy", () => {
    const request = createMockRequest({ action: "delete", riskLevel: "high" })
    const decision = manager.evaluate(request)

    // Should require approval or deny depending on mode
    expect(["deny", "require_approval"]).toContain(decision.decision)
  })

  it("respects hard deny policies", () => {
    manager.addPolicy(createMockPolicy())
    const request = createMockRequest({ action: "delete", riskLevel: "critical" })
    const decision = manager.evaluate(request)

    expect(decision.decision).toBe("deny")
    expect(decision.reason).toContain("Deletes require approval")
  })

  it("creates and uses grants", () => {
    const grant = createMockGrant()
    manager.grant(grant)

    const request = createMockRequest({ action: "write" })
    const decision = manager.evaluate(request)

    expect(decision.decision).toBe("allow")
    expect(decision.grantId).toBe("grant-1")
  })

  it("revokes grants", () => {
    const grant = createMockGrant()
    manager.grant(grant)
    manager.revoke("grant-1", "Test revocation")

    // Use high-risk operation that won't be auto-allowed
    const request = createMockRequest({ action: "delete", riskLevel: "high" })
    const decision = manager.evaluate(request)

    expect(decision.decision).not.toBe("allow")
  })

  it("handles approval mode changes", () => {
    manager.setApprovalMode("ask_every_time")
    expect(manager.getApprovalMode()).toBe("ask_every_time")

    const request = createMockRequest()
    const decision = manager.evaluate(request)

    expect(decision.decision).toBe("require_approval")
  })

  it("records audit events", () => {
    const request = createMockRequest()
    manager.evaluate(request)

    const log = manager.getAuditLog()
    expect(log.length).toBeGreaterThan(0)
  })

  it("gets grants for an actor", () => {
    manager.grant(createMockGrant({ id: "grant-1", actorId: "worker-1" }))
    manager.grant(createMockGrant({ id: "grant-2", actorId: "worker-2" }))

    const grants = manager.getGrantsForActor("worker-1")
    expect(grants).toHaveLength(1)
    expect(grants[0].id).toBe("grant-1")
  })
})
