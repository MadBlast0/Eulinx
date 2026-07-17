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
})
