/**
 * P06-SPAWN-MANAGER — Spawner Types Tests
 */

import { describe, it, expect } from "vitest"
import {
  STANDARD_ROLES,
  DEFAULT_ROLE_BUDGET,
  DEFAULT_TIMEOUT_PROFILE,
  DEFAULT_HIERARCHY_LIMITS,
  SPAWNER,
} from "./spawner-types"

describe("Spawner Types", () => {
  describe("DEFAULT_ROLE_BUDGET", () => {
    it("has sensible defaults", () => {
      expect(DEFAULT_ROLE_BUDGET.maxTokens).toBe(100_000)
      expect(DEFAULT_ROLE_BUDGET.maxCostUsd).toBe(5.0)
      expect(DEFAULT_ROLE_BUDGET.maxToolCalls).toBe(500)
      expect(DEFAULT_ROLE_BUDGET.maxWallClockMs).toBe(1_800_000)
      expect(DEFAULT_ROLE_BUDGET.maxChildren).toBe(8)
    })
  })

  describe("DEFAULT_TIMEOUT_PROFILE", () => {
    it("has sensible timeouts", () => {
      expect(DEFAULT_TIMEOUT_PROFILE.requestedMs).toBe(60_000)
      expect(DEFAULT_TIMEOUT_PROFILE.spawningMs).toBe(30_000)
      expect(DEFAULT_TIMEOUT_PROFILE.initializingMs).toBe(60_000)
      expect(DEFAULT_TIMEOUT_PROFILE.idleMs).toBe(900_000)
      expect(DEFAULT_TIMEOUT_PROFILE.workingMs).toBe(1_800_000)
      expect(DEFAULT_TIMEOUT_PROFILE.waitingMs).toBe(300_000)
      expect(DEFAULT_TIMEOUT_PROFILE.failingMs).toBe(30_000)
      expect(DEFAULT_TIMEOUT_PROFILE.terminatingMs).toBe(30_000)
      expect(DEFAULT_TIMEOUT_PROFILE.zombieMs).toBe(300_000)
    })
  })

  describe("DEFAULT_HIERARCHY_LIMITS", () => {
    it("prevents fork bombs", () => {
      expect(DEFAULT_HIERARCHY_LIMITS.maxDepth).toBe(5)
      expect(DEFAULT_HIERARCHY_LIMITS.maxChildrenPerWorker).toBe(8)
      expect(DEFAULT_HIERARCHY_LIMITS.maxDescendantsPerRoot).toBe(64)
      expect(DEFAULT_HIERARCHY_LIMITS.maxLiveWorkersPerWorkspace).toBe(32)
    })
  })

  describe("SPAWNER constants", () => {
    it("has launch timeout", () => {
      expect(SPAWNER.DEFAULT_LAUNCH_TIMEOUT_MS).toBe(30_000)
    })

    it("has max queue size", () => {
      expect(SPAWNER.DEFAULT_MAX_SPAWN_QUEUE).toBe(100)
    })

    it("has context window threshold", () => {
      expect(SPAWNER.CONTEXT_WINDOW_THRESHOLD).toBe(0.6)
    })

    it("has env allowlist", () => {
      expect(SPAWNER.ENV_ALLOWLIST).toContain("PATH")
      expect(SPAWNER.ENV_ALLOWLIST).toContain("EULINX_WORKER_ID")
      expect(SPAWNER.ENV_ALLOWLIST).not.toContain("SSH_AUTH_SOCK")
    })
  })

  describe("STANDARD_ROLES", () => {
    it("has 5 standard roles", () => {
      expect(STANDARD_ROLES.length).toBe(5)
    })

    it("orchestrator can spawn builders, reviewers, testers, researchers", () => {
      const orchestrator = STANDARD_ROLES.find(r => r.roleId === "orchestrator")
      expect(orchestrator).toBeDefined()
      expect(orchestrator?.allowedChildRoleIds).toContain("builder")
      expect(orchestrator?.allowedChildRoleIds).toContain("reviewer")
      expect(orchestrator?.allowedChildRoleIds).toContain("tester")
      expect(orchestrator?.allowedChildRoleIds).toContain("researcher")
    })

    it("reviewer has no children", () => {
      const reviewer = STANDARD_ROLES.find(r => r.roleId === "reviewer")
      expect(reviewer).toBeDefined()
      expect(reviewer?.allowedChildRoleIds).toHaveLength(0)
    })

    it("builder can only spawn testers", () => {
      const builder = STANDARD_ROLES.find(r => r.roleId === "builder")
      expect(builder).toBeDefined()
      expect(builder?.allowedChildRoleIds).toEqual(["tester"])
    })

    it("researcher has no children", () => {
      const researcher = STANDARD_ROLES.find(r => r.roleId === "researcher")
      expect(researcher).toBeDefined()
      expect(researcher?.allowedChildRoleIds).toHaveLength(0)
    })

    it("reviewer uses project_readonly sandbox", () => {
      const reviewer = STANDARD_ROLES.find(r => r.roleId === "reviewer")
      expect(reviewer?.sandboxStrategy).toBe("project_readonly")
    })

    it("researcher uses isolated_temp sandbox", () => {
      const researcher = STANDARD_ROLES.find(r => r.roleId === "researcher")
      expect(researcher?.sandboxStrategy).toBe("isolated_temp")
    })

    it("all roles are not deprecated", () => {
      for (const role of STANDARD_ROLES) {
        expect(role.deprecated).toBe(false)
      }
    })

    it("all roles have version 1", () => {
      for (const role of STANDARD_ROLES) {
        expect(role.version).toBe(1)
      }
    })
  })
})
