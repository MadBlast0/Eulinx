/**
 * P14-SEC-PERMISSION — Permission Store Tests
 */

import { describe, it, expect } from "vitest"
import { usePermissionStore, PERMISSION_CATALOG } from "./permission-store"
import type { WorkspaceId } from "@/core/types"

const WS = "test-ws" as WorkspaceId

describe("PermissionStore", () => {
  it("seeds catalog defaults on init", () => {
    const store = usePermissionStore.getState()
    for (const entry of PERMISSION_CATALOG) {
      expect(store.isGranted(entry.id)).toBe(entry.defaultOn)
    }
  })

  it("grants a permission via setGranted", () => {
    const store = usePermissionStore.getState()
    const toggled = PERMISSION_CATALOG.find((e) => !e.defaultOn)
    expect(toggled).toBeDefined()
    store.setGranted(toggled!.id, true)
    expect(usePermissionStore.getState().isGranted(toggled!.id)).toBe(true)
  })

  it("revokes a permission via setGranted", () => {
    const store = usePermissionStore.getState()
    const toggled = PERMISSION_CATALOG.find((e) => e.defaultOn)
    expect(toggled).toBeDefined()
    store.setGranted(toggled!.id, false)
    expect(usePermissionStore.getState().isGranted(toggled!.id)).toBe(false)
  })

  it("bumps version on grant/revoke", () => {
    const before = usePermissionStore.getState().version
    usePermissionStore.getState().setGranted(PERMISSION_CATALOG[0]!.id, true)
    expect(usePermissionStore.getState().version).toBeGreaterThan(before)
  })

  it("re-seeds defaults when context changes", () => {
    usePermissionStore.getState().setContext(WS, "user")
    for (const entry of PERMISSION_CATALOG) {
      expect(usePermissionStore.getState().isGranted(entry.id)).toBe(entry.defaultOn)
    }
  })

  it("ignores unknown permission ids", () => {
    const before = usePermissionStore.getState().version
    usePermissionStore.getState().setGranted("does.not.exist", true)
    expect(usePermissionStore.getState().version).toBe(before)
  })
})
