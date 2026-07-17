/**
 * P06-SPAWN-VALIDATE — Spawn Request Validation Tests
 */

import { describe, it, expect } from "vitest"
import {
  validateSchema,
  validateSpawnRequest,
  buildSpawnReadiness,
} from "./spawner-validation"
import type { ValidationContext } from "./spawner-validation"

describe("Schema Validation (Layer 1)", () => {
  it("passes with all required fields", () => {
    const violations = validateSchema({
      id: "req_123",
      workspaceId: "ws_123",
      projectId: "proj_123",
      sessionId: "ses_123",
      cliProfileId: "claude-code",
      promptPackageId: "pp_123",
      contextPackageId: "cp_123",
      permissionProfileId: "perm_123",
      sandboxProfileId: "sbx_123",
      spawnMode: "normal",
      priority: "normal",
    })
    expect(violations).toHaveLength(0)
  })

  it("rejects missing id", () => {
    const violations = validateSchema({
      workspaceId: "ws_123",
      projectId: "proj_123",
      sessionId: "ses_123",
      cliProfileId: "claude-code",
      promptPackageId: "pp_123",
      contextPackageId: "cp_123",
      permissionProfileId: "perm_123",
    })
    expect(violations.some(v => v.field === "id")).toBe(true)
  })

  it("rejects missing workspaceId", () => {
    const violations = validateSchema({
      id: "req_123",
      projectId: "proj_123",
      sessionId: "ses_123",
      cliProfileId: "claude-code",
      promptPackageId: "pp_123",
      contextPackageId: "cp_123",
      permissionProfileId: "perm_123",
    })
    expect(violations.some(v => v.field === "workspaceId")).toBe(true)
  })

  it("rejects missing sessionId", () => {
    const violations = validateSchema({
      id: "req_123",
      workspaceId: "ws_123",
      projectId: "proj_123",
      cliProfileId: "claude-code",
      promptPackageId: "pp_123",
      contextPackageId: "cp_123",
      permissionProfileId: "perm_123",
    })
    expect(violations.some(v => v.field === "sessionId")).toBe(true)
  })

  it("rejects unknown spawn mode", () => {
    const violations = validateSchema({
      id: "req_123",
      workspaceId: "ws_123",
      projectId: "proj_123",
      sessionId: "ses_123",
      cliProfileId: "claude-code",
      promptPackageId: "pp_123",
      contextPackageId: "cp_123",
      permissionProfileId: "perm_123",
      spawnMode: "invalid_mode",
    })
    expect(violations.some(v => v.field === "spawnMode")).toBe(true)
  })

  it("rejects unknown priority", () => {
    const violations = validateSchema({
      id: "req_123",
      workspaceId: "ws_123",
      projectId: "proj_123",
      sessionId: "ses_123",
      cliProfileId: "claude-code",
      promptPackageId: "pp_123",
      contextPackageId: "cp_123",
      permissionProfileId: "perm_123",
      priority: "ultra",
    })
    expect(violations.some(v => v.field === "priority")).toBe(true)
  })

  it("rejects negative parent depth", () => {
    const violations = validateSchema({
      id: "req_123",
      workspaceId: "ws_123",
      projectId: "proj_123",
      sessionId: "ses_123",
      cliProfileId: "claude-code",
      promptPackageId: "pp_123",
      contextPackageId: "cp_123",
      permissionProfileId: "perm_123",
      parentRef: { kind: "worker", depth: -1 },
    })
    expect(violations.some(v => v.field === "parentRef.depth")).toBe(true)
  })

  it("rejects absolute file paths in contextSeed", () => {
    const violations = validateSchema({
      id: "req_123",
      workspaceId: "ws_123",
      projectId: "proj_123",
      sessionId: "ses_123",
      cliProfileId: "claude-code",
      promptPackageId: "pp_123",
      contextPackageId: "cp_123",
      permissionProfileId: "perm_123",
      contextSeed: { explicitFilePaths: ["/etc/passwd"] },
    })
    expect(violations.some(v => v.field === "contextSeed.explicitFilePaths" && v.rule === "relative_path")).toBe(true)
  })

  it("rejects .. in file paths", () => {
    const violations = validateSchema({
      id: "req_123",
      workspaceId: "ws_123",
      projectId: "proj_123",
      sessionId: "ses_123",
      cliProfileId: "claude-code",
      promptPackageId: "pp_123",
      contextPackageId: "cp_123",
      permissionProfileId: "perm_123",
      contextSeed: { explicitFilePaths: ["src/../etc/passwd"] },
    })
    expect(violations.some(v => v.field === "contextSeed.explicitFilePaths" && v.rule === "no_dotdot")).toBe(true)
  })

  it("rejects modelId without providerId", () => {
    const violations = validateSchema({
      id: "req_123",
      workspaceId: "ws_123",
      projectId: "proj_123",
      sessionId: "ses_123",
      cliProfileId: "claude-code",
      promptPackageId: "pp_123",
      contextPackageId: "cp_123",
      permissionProfileId: "perm_123",
      modelPreference: { modelId: "claude-opus-4-8" },
    })
    expect(violations.some(v => v.field === "modelPreference")).toBe(true)
  })

  it("rejects retryOf pointing at itself", () => {
    const violations = validateSchema({
      id: "req_123",
      workspaceId: "ws_123",
      projectId: "proj_123",
      sessionId: "ses_123",
      cliProfileId: "claude-code",
      promptPackageId: "pp_123",
      contextPackageId: "cp_123",
      permissionProfileId: "perm_123",
      retryOf: "req_123",
    })
    expect(violations.some(v => v.field === "retryOf")).toBe(true)
  })

  it("returns all violations, not just the first", () => {
    const violations = validateSchema({})
    expect(violations.length).toBeGreaterThanOrEqual(5) // id, workspaceId, projectId, sessionId, cliProfileId, promptPackageId, contextPackageId, permissionProfileId
  })
})

describe("Full Validation Pipeline", () => {
  const validRequest = {
    id: "req_123",
    workspaceId: "ws_123",
    projectId: "proj_123",
    sessionId: "ses_123",
    cliProfileId: "claude-code",
    promptPackageId: "pp_123",
    contextPackageId: "cp_123",
    permissionProfileId: "perm_123",
    sandboxProfileId: "sbx_123",
    spawnMode: "normal",
    priority: "normal",
  }

  const validContext: ValidationContext = {
    workspaceLoaded: true,
    workspaceArchived: false,
    sessionActive: true,
    parentExists: true,
    parentInSameWorkspace: true,
    parentCanSpawn: true,
    cliProfileExists: true,
    cliExecutableAvailable: true,
    runtimeReady: true,
    budgetAvailable: true,
  }

  it("passes with valid request and context", () => {
    const result = validateSpawnRequest(validRequest, validContext)
    expect(result.valid).toBe(true)
  })

  it("rejects when workspace not loaded", () => {
    const result = validateSpawnRequest(validRequest, { ...validContext, workspaceLoaded: false })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.failures.some(f => f.kind === "workspace_not_loaded")).toBe(true)
    }
  })

  it("rejects when workspace archived", () => {
    const result = validateSpawnRequest(validRequest, { ...validContext, workspaceArchived: true })
    expect(result.valid).toBe(false)
  })

  it("rejects when session not active", () => {
    const result = validateSpawnRequest(validRequest, { ...validContext, sessionActive: false })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.failures.some(f => f.kind === "session_closed")).toBe(true)
    }
  })

  it("rejects when parent not found", () => {
    const result = validateSpawnRequest(
      { ...validRequest, parentWorkerId: "wkr_parent" },
      { ...validContext, parentExists: false },
    )
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.failures.some(f => f.kind === "parent_not_found")).toBe(true)
    }
  })

  it("rejects when CLI profile missing", () => {
    const result = validateSpawnRequest(validRequest, { ...validContext, cliProfileExists: false })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.failures.some(f => f.kind === "cli_profile_missing")).toBe(true)
    }
  })

  it("rejects when budget exceeded", () => {
    const result = validateSpawnRequest(validRequest, { ...validContext, budgetAvailable: false })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.failures.some(f => f.kind === "budget_exceeded")).toBe(true)
    }
  })

  it("rejects when runtime not ready", () => {
    const result = validateSpawnRequest(validRequest, { ...validContext, runtimeReady: false })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.failures.some(f => f.kind === "runtime_not_ready")).toBe(true)
    }
  })

  it("reports multiple failures", () => {
    const result = validateSpawnRequest(validRequest, {
      ...validContext,
      workspaceLoaded: false,
      sessionActive: false,
      runtimeReady: false,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.failures.length).toBeGreaterThanOrEqual(3)
    }
  })
})

describe("buildSpawnReadiness", () => {
  it("builds ready readiness from valid result", () => {
    const readiness = buildSpawnReadiness("req_123", { valid: true })
    expect(readiness.ready).toBe(true)
    expect(readiness.blockedBy).toHaveLength(0)
  })

  it("builds blocked readiness from invalid result", () => {
    const readiness = buildSpawnReadiness("req_123", {
      valid: false,
      failures: [
        { layer: "workspace", kind: "workspace_not_loaded", detail: "test", retryable: false, message: "not loaded" },
      ],
    })
    expect(readiness.ready).toBe(false)
    expect(readiness.blockedBy).toHaveLength(1)
    expect(readiness.blockedBy[0]?.kind).toBe("workspace_not_loaded")
  })
})
