import { describe, it, expect, vi, beforeEach } from "vitest"
import { RuntimeApi, createRuntimeApi } from "./runtime-apis"
import { RuntimeManager } from "./runtime-manager"
import { createCommand, RUNTIME_COMMANDS } from "./runtime-commands"

vi.mock("@/core/config", () => ({
  loadConfig: vi.fn().mockResolvedValue({ ok: true, value: {} }),
}))

describe("RuntimeApi", () => {
  let manager: RuntimeManager
  let api: RuntimeApi

  beforeEach(() => {
    manager = new RuntimeManager()
    api = new RuntimeApi(manager)
  })

  it("starts the runtime", async () => {
    const result = await api.start()
    expect(result.ok).toBe(true)
    expect(api.state).toBe("running")
  })

  it("stops the runtime", async () => {
    await api.start()
    const result = await api.stop({ gracePeriodMs: 100 })
    expect(result.ok).toBe(true)
  })

  it("pauses and resumes", async () => {
    await api.start()
    const pauseResult = await api.pause("test")
    expect(pauseResult.ok).toBe(true)
    expect(api.state).toBe("paused")

    const resumeResult = await api.resume()
    expect(resumeResult.ok).toBe(true)
  })

  it("returns health", async () => {
    await api.start()
    const health = await api.getHealth()
    expect(health.runtimeState).toBe("running")
  })

  it("returns diagnostics", async () => {
    await api.start()
    const diag = api.getDiagnostics()
    expect(diag.runtimeState).toBe("running")
  })

  it("executes commands", async () => {
    await api.start()
    const cmd = createCommand(RUNTIME_COMMANDS.HEALTH_GET, {})
    const result = await api.executeCommand(cmd)
    expect(result.ok).toBe(true)
  })

  it("sends commands via convenience method", async () => {
    await api.start()
    const result = await api.sendCommand(RUNTIME_COMMANDS.HEALTH_GET, {})
    expect(result.ok).toBe(true)
  })

  it("reports isReady", async () => {
    expect(api.isReady).toBe(false)
    await api.start()
    expect(api.isReady).toBe(true)
  })

  it("checks state", async () => {
    expect(api.isState("uninitialized")).toBe(true)
    await api.start()
    expect(api.isState("running")).toBe(true)
  })
})

describe("createRuntimeApi", () => {
  it("creates an API instance", () => {
    const manager = new RuntimeManager()
    const api = createRuntimeApi(manager)
    expect(api).toBeInstanceOf(RuntimeApi)
  })
})
