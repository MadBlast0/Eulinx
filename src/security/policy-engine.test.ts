/**
 * P14-SEC-POLICY — Policy Engine Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { PolicyEngine } from "./policy-engine"
import type { PermissionPolicy, PermissionRequest } from "./security-types"
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

function createMockPolicy(overrides: Partial<PermissionPolicy> = {}): PermissionPolicy {
  return {
    id: "policy-1",
    name: "Test Policy",
    scope: "workspace",
    scopeId: "ws-1",
    rules: [
      { action: "delete", resourceType: "*", decision: "deny", reason: "No deletes" },
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

describe("PolicyEngine", () => {
  let engine: PolicyEngine

  beforeEach(() => {
    engine = new PolicyEngine()
  })

  it("adds and retrieves policies", () => {
    const policy = createMockPolicy()
    engine.addPolicy(policy)

    const retrieved = engine.getPolicy("policy-1")
    expect(retrieved).toBeDefined()
    expect(retrieved?.name).toBe("Test Policy")
  })

  it("removes policies", () => {
    engine.addPolicy(createMockPolicy())
    const result = engine.removePolicy("policy-1")

    expect(result).toBe(true)
    expect(engine.getPolicy("policy-1")).toBeUndefined()
  })

  it("gets policies for workspace scope", () => {
    engine.addPolicy(createMockPolicy({ scope: "workspace", scopeId: "ws-1" }))
    engine.addPolicy(createMockPolicy({ id: "policy-2", scope: "workspace", scopeId: "ws-2" }))

    const policies = engine.getPoliciesForScope("ws-1")
    expect(policies).toHaveLength(1)
    expect(policies[0].id).toBe("policy-1")
  })

  it("gets application policies for any workspace", () => {
    engine.addPolicy(createMockPolicy({ scope: "application", scopeId: undefined }))

    const policies = engine.getPoliciesForScope("ws-1")
    expect(policies).toHaveLength(1)
  })

  it("checks hard denies", () => {
    const policy = createMockPolicy()
    const request = createMockRequest({ action: "delete" })

    const deny = engine.checkHardDeny(policy, request)
    expect(deny).toBe("No deletes")
  })

  it("returns undefined for non-deny rules", () => {
    const policy = createMockPolicy()
    const request = createMockRequest({ action: "read" })

    const deny = engine.checkHardDeny(policy, request)
    expect(deny).toBeUndefined()
  })

  it("evaluates policies correctly", () => {
    engine.addPolicy(createMockPolicy())
    const policies = engine.getPoliciesForScope("ws-1")

    const readResult = engine.evaluate(policies, createMockRequest({ action: "read" }))
    expect(readResult.decision).toBe("allow")

    const deleteResult = engine.evaluate(policies, createMockRequest({ action: "delete" }))
    expect(deleteResult.decision).toBe("deny")
  })

  it("lists all policies", () => {
    engine.addPolicy(createMockPolicy())
    engine.addPolicy(createMockPolicy({ id: "policy-2" }))

    expect(engine.listPolicies()).toHaveLength(2)
  })

  it("skips disabled policies", () => {
    engine.addPolicy(createMockPolicy({ enabled: false }))

    const policies = engine.getPoliciesForScope("ws-1")
    expect(policies).toHaveLength(0)
  })

  it("sorts by priority", () => {
    engine.addPolicy(createMockPolicy({ id: "low", priority: 1 }))
    engine.addPolicy(createMockPolicy({ id: "high", priority: 100 }))

    const policies = engine.getPoliciesForScope("ws-1")
    expect(policies[0].id).toBe("high")
  })
})
