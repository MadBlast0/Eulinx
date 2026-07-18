/**
 * P14-SEC-SECRET — Secret Manager Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { SecretManager } from "./secret-manager"

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SecretManager", () => {
  let manager: SecretManager

  beforeEach(() => {
    manager = new SecretManager()
  })

  it("stores and retrieves secrets", () => {
    const secret = manager.set({
      name: "api-key",
      value: "sk-123456",
    })

    const retrieved = manager.get(secret.id)
    expect(retrieved).toBeDefined()
    expect(retrieved?.name).toBe("api-key")
    expect(retrieved?.value).toBe("sk-123456")
  })

  it("gets secret by name", () => {
    manager.set({ name: "api-key", value: "sk-123456" })

    const secret = manager.getByName("api-key")
    expect(secret).toBeDefined()
    expect(secret?.value).toBe("sk-123456")
  })

  it("deletes secrets", () => {
    const secret = manager.set({ name: "api-key", value: "sk-123456" })

    const result = manager.delete(secret.id)
    expect(result).toBe(true)
    expect(manager.get(secret.id)).toBeUndefined()
  })

  it("lists secrets without values", () => {
    manager.set({ name: "api-key", value: "sk-123456" })

    const list = manager.list()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe("api-key")
    expect("value" in list[0]).toBe(false)
  })

  it("checks if secret exists", () => {
    const secret = manager.set({ name: "api-key", value: "sk-123456" })

    expect(manager.has(secret.id)).toBe(true)
    expect(manager.has("nonexistent")).toBe(false)
  })

  it("tracks last accessed", () => {
    const secret = manager.set({ name: "api-key", value: "sk-123456" })

    manager.get(secret.id)
    const retrieved = manager.get(secret.id)

    expect(retrieved?.lastAccessedAt).toBeDefined()
  })
})
