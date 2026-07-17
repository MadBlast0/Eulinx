/**
 * P06-SPAWN-WFACTORY — Worker Creation Tests
 */

import { describe, it, expect } from "vitest"
import type { IsoTimestamp } from "@/core/types"
import {
  assignIdentity,
  resolveRole,
  narrowBudget,
  computeSandboxRoot,
  generateDisplayName,
} from "./worker-creation"
import { STANDARD_ROLES } from "./spawner-types"
import type { WorkerRole, WorkerBudget } from "./spawner-types"

describe("Role Resolution", () => {
  const roleRegistry = new Map<string, WorkerRole>()
  for (const role of STANDARD_ROLES) {
    roleRegistry.set(role.roleId, role as WorkerRole)
  }

  it("resolves a valid role", () => {
    const result = resolveRole("builder", roleRegistry)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.role.roleId).toBe("builder")
    }
  })

  it("returns frozen snapshot (deep clone)", () => {
    const result = resolveRole("builder", roleRegistry)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const original = roleRegistry.get("builder")!
      // Modifying the resolved role should not affect the registry
      ;(result.role as { description: string }).description = "modified"
      expect(original.description).not.toBe("modified")
    }
  })

  it("rejects unknown role", () => {
    const result = resolveRole("unknown_role", roleRegistry)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe("role_not_found")
    }
  })

  it("rejects deprecated role", () => {
    const deprecated = new Map(roleRegistry)
    deprecated.set("old_role", { ...roleRegistry.get("builder")!, roleId: "old_role", deprecated: true })
    const result = resolveRole("old_role", deprecated)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe("role_not_found")
    }
  })

  it("rejects child role not in parent's allowedChildRoleIds", () => {
    const parentRole = roleRegistry.get("reviewer")!
    const result = resolveRole("builder", roleRegistry, parentRole)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe("inheritance_violation")
    }
  })

  it("allows child role in parent's allowedChildRoleIds", () => {
    const parentRole = roleRegistry.get("orchestrator")!
    const result = resolveRole("builder", roleRegistry, parentRole)
    expect(result.ok).toBe(true)
  })
})

describe("Identity Assignment", () => {
  let idCounter = 0
  const idGenerator = () => `wkr_${String(++idCounter).padStart(3, "0")}`

  it("creates root identity for non-worker parent", () => {
    const identity = assignIdentity({
      rolePrefix: "builder",
      siblingCount: 0,
      idGenerator,
    })
    expect(identity.workerId).toMatch(/^wkr_/)
    expect(identity.rootWorkerId).toBe(identity.workerId)
    expect(identity.depth).toBe(0)
    expect(identity.siblingIndex).toBe(0)
    expect(identity.lineage).toEqual([identity.workerId])
    expect(identity.displayName).toMatch(/^builder-0-/)
  })

  it("creates child identity for worker parent", () => {
    const identity = assignIdentity({
      parentRef: { kind: "worker", id: "wkr_parent", depth: 2 },
      parentRecord: {
        workerId: "wkr_parent",
        workspaceId: "ws_1",
        sessionId: "ses_1",
        state: "working",
        stateEnteredAt: "2026-01-01T00:00:00Z" as IsoTimestamp,
        transitionSeq: 5,
        missedHeartbeats: 0,
        health: "healthy",
        restartGeneration: 0,
        rootWorkerId: "wkr_grandparent",
        parentWorkerId: "wkr_grandparent",
        depth: 2,
        lineage: ["wkr_grandparent", "wkr_parent"],
        createdAt: "2026-01-01T00:00:00Z" as IsoTimestamp,
        updatedAt: "2026-01-01T00:00:00Z" as IsoTimestamp,
      },
      rolePrefix: "tester",
      siblingCount: 3,
      idGenerator,
    })
    expect(identity.depth).toBe(3)
    expect(identity.siblingIndex).toBe(3)
    expect(identity.lineage).toContain("wkr_parent")
    expect(identity.displayName).toMatch(/^tester-3-/)
  })
})

describe("Budget Narrowing", () => {
  const baseBudget: WorkerBudget = {
    maxTokens: 100_000,
    maxCostUsd: 5.0,
    maxToolCalls: 500,
    maxWallClockMs: 1_800_000,
    maxChildren: 8,
  }

  it("returns base budget when no override", () => {
    const result = narrowBudget(baseBudget)
    expect(result).toEqual(baseBudget)
  })

  it("narrows tokens", () => {
    const result = narrowBudget(baseBudget, { maxTokens: 10_000 })
    expect(result.maxTokens).toBe(10_000)
  })

  it("does not widen beyond base", () => {
    const result = narrowBudget(baseBudget, { maxTokens: 200_000 })
    expect(result.maxTokens).toBe(100_000)
  })

  it("narrows cost", () => {
    const result = narrowBudget(baseBudget, { maxCostUsd: 1.0 })
    expect(result.maxCostUsd).toBe(1.0)
  })

  it("narrows tool calls", () => {
    const result = narrowBudget(baseBudget, { maxToolCalls: 50 })
    expect(result.maxToolCalls).toBe(50)
  })

  it("narrows wall clock", () => {
    const result = narrowBudget(baseBudget, { maxWallClockMs: 600_000 })
    expect(result.maxWallClockMs).toBe(600_000)
  })

  it("narrows children", () => {
    const result = narrowBudget(baseBudget, { maxChildren: 2 })
    expect(result.maxChildren).toBe(2)
  })

  it("handles partial override", () => {
    const result = narrowBudget(baseBudget, { maxTokens: 50_000 })
    expect(result.maxTokens).toBe(50_000)
    expect(result.maxCostUsd).toBe(5.0)
    expect(result.maxToolCalls).toBe(500)
  })
})

describe("Sandbox Root Computation", () => {
  it("computes deterministic path", () => {
    const root = computeSandboxRoot("/workspace/runtime", "wkr_001")
    expect(root).toBe("/workspace/runtime/workers/wkr_001/")
  })
})

describe("Display Name Generation", () => {
  it("generates display name", () => {
    const name = generateDisplayName("builder", 0, "wkr_01HQ8F3K2MQZX")
    expect(name).toBe("builder-0-K2MQZX")
  })
})
