import { describe, it, expect } from "vitest"
import { PluginLifecycleManager } from "./plugin-lifecycle"
import { PermissionManager } from "@/security/permission-manager"
import type { PluginManifest } from "./plugin-types"
import { brand } from "@/core/types"

function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    schema: "1.0",
    id: "local/test",
    name: "Test",
    version: "1.0.0",
    engines: ">=0.1.0",
    author: "dev",
    summary: "A test plugin",
    description: null,
    icon: null,
    homepage: null,
    capabilities: [],
    contributes: {
      tools: [{ name: "t", description: "d", schema: { type: "object" }, permissionRequired: null }],
      nodes: [],
      hooks: [],
      settings: [],
      panels: [],
    },
    sdkVersion: "1.0.0",
    main: "index.js",
    signature: null,
    ...overrides,
  }
}

describe("PluginLifecycleManager.validate", () => {
  it("rejects a manifest with zero contributions (no purpose)", async () => {
    const lm = new PluginLifecycleManager()
    const result = await lm.validate(makeManifest({
      contributes: { tools: [], nodes: [], hooks: [], settings: [], panels: [] },
    }))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("zero contributions"))).toBe(true)
  })

  it("rejects a reserved plugin id prefix", async () => {
    const lm = new PluginLifecycleManager()
    const result = await lm.validate(makeManifest({ id: "eulinx/internal" }))
    expect(result.valid).toBe(false)
  })

  it("fails closed: capability denied by PermissionManager -> invalid", async () => {
    const lm = new PluginLifecycleManager()
    const pm = new PermissionManager()
    // deny_by_default: every capability is denied.
    pm.setApprovalMode("deny_by_default")

    const manifest = makeManifest({
      capabilities: [{ capability: "fs.read", scope: "*", reason: "needs to read" }],
    })
    const result = await lm.validate(manifest, {
      permissionManager: pm,
      workspaceId: brand("ws-1"),
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("fs.read"))).toBe(true)

    const instance = lm.getInstance("local/test")
    expect(instance?.grantRecord[0]?.granted).toBe(false)
  })

  it("grants capability when the policy allows it", async () => {
    const lm = new PluginLifecycleManager()
    const pm = new PermissionManager()
    // auto-allow low risk; fs.read maps to low risk.
    pm.setApprovalMode("auto_allow_low_risk")

    const manifest = makeManifest({
      capabilities: [{ capability: "fs.read", scope: "*", reason: "needs to read" }],
    })
    const result = await lm.validate(manifest, {
      permissionManager: pm,
      workspaceId: brand("ws-1"),
    })
    expect(result.valid).toBe(true)
    const instance = lm.getInstance("local/test")
    expect(instance?.grantRecord[0]?.granted).toBe(true)
  })

  it("does not hardcode granted when no PermissionManager is supplied", async () => {
    const lm = new PluginLifecycleManager()
    const manifest = makeManifest({
      capabilities: [{ capability: "fs.write", scope: "*", reason: "wants to write" }],
    })
    const result = await lm.validate(manifest)
    expect(result.valid).toBe(true)
    const instance = lm.getInstance("local/test")
    // Without a permission manager we must NOT silently mark granted; the
    // grant record reflects "not yet decided" (false) so the host stays safe.
    expect(instance?.grantRecord[0]?.granted).toBe(false)
  })
})
