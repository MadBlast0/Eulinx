import { describe, it, expect } from "vitest"
import { getConfig, loadConfig, updateConfig } from "./config"

describe("Config", () => {
  it("getConfig returns defaults", () => {
    const config = getConfig()
    expect(config.app.name).toBe("Eulinx")
    expect(config.runtime.maxConcurrentWorkers).toBe(8)
  })

  it("loadConfig applies overrides", () => {
    const result = loadConfig({ runtime: { maxConcurrentWorkers: 4, maxConcurrentTasks: 8, shutdownTimeoutMs: 5000 } })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.runtime.maxConcurrentWorkers).toBe(4)
      expect(result.value.runtime.maxConcurrentTasks).toBe(8)
    }
  })

  it("loadConfig rejects invalid values", () => {
    const result = loadConfig({ runtime: { maxConcurrentWorkers: 0, maxConcurrentTasks: 8, shutdownTimeoutMs: 5000 } })
    expect(result.ok).toBe(false)
  })

  it("updateConfig merges partial", () => {
    const result = updateConfig({ ui: { theme: "dark", sidebarWidth: 300, debounceMs: 200 } })
    expect(result.ok).toBe(true)
  })

  it("getConfig includes helixdb defaults", () => {
    const config = getConfig()
    expect(config.helixdb.enabled).toBe(false)
    expect(config.helixdb.host).toBe("127.0.0.1")
    expect(config.helixdb.port).toBe(9743)
    expect(config.helixdb.timeout).toBe(30_000)
    expect(config.helixdb.retryAttempts).toBe(3)
  })

  it("loadConfig applies helixdb overrides", () => {
    const result = loadConfig({
      helixdb: {
        enabled: true,
        host: "192.168.1.100",
        port: 8080,
        timeout: 15_000,
        retryAttempts: 5,
      },
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.helixdb.enabled).toBe(true)
      expect(result.value.helixdb.host).toBe("192.168.1.100")
      expect(result.value.helixdb.port).toBe(8080)
      expect(result.value.helixdb.timeout).toBe(15_000)
      expect(result.value.helixdb.retryAttempts).toBe(5)
    }
  })

  it("loadConfig rejects invalid helixdb config", () => {
    const result = loadConfig({
      helixdb: {
        enabled: false,
        host: "",
        port: 9743,
        timeout: 30_000,
        retryAttempts: 3,
      },
    })
    expect(result.ok).toBe(false)
  })
})
