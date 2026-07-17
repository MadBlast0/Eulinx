import { describe, it, expect, vi, beforeEach } from "vitest"
import { RuntimeManager } from "./runtime-manager"
import { createCommand, RUNTIME_COMMANDS } from "./runtime-commands"

// Mock loadConfig to avoid file system access
vi.mock("@/core/config", () => ({
  loadConfig: vi.fn().mockResolvedValue({ ok: true, value: {} }),
}))

describe("RuntimeManager", () => {
  let manager: RuntimeManager

  beforeEach(() => {
    manager = new RuntimeManager()
  })

  it("starts in uninitialized state", () => {
    expect(manager.state).toBe("uninitialized")
  })

  it("starts the runtime", async () => {
    const result = await manager.start()
    expect(result.ok).toBe(true)
    expect(manager.state).toBe("running")
  })

  it("cannot start twice", async () => {
    await manager.start()
    const result = await manager.start()
    expect(result.ok).toBe(false)
  })

  it("stops the runtime", async () => {
    await manager.start()
    const result = await manager.stop({ gracePeriodMs: 100 })
    expect(result.ok).toBe(true)
    expect(manager.state).toBe("stopped")
  })

  it("pauses and resumes", async () => {
    await manager.start()
    const pauseResult = await manager.pause("test")
    expect(pauseResult.ok).toBe(true)
    expect(manager.state).toBe("paused")

    const resumeResult = await manager.resume()
    expect(resumeResult.ok).toBe(true)
    expect(manager.state).toBe("running")
  })

  it("cannot pause from uninitialized", async () => {
    const result = await manager.pause("test")
    expect(result.ok).toBe(false)
  })

  it("cannot resume from running", async () => {
    await manager.start()
    const result = await manager.resume()
    expect(result.ok).toBe(false)
  })

  it("returns health snapshot", async () => {
    await manager.start()
    const health = await manager.getHealth()
    expect(health.runtimeState).toBe("running")
    expect(health.overallStatus).toBeDefined()
    expect(health.services).toBeDefined()
    expect(health.updatedAt).toBeDefined()
  })

  it("returns diagnostics", async () => {
    await manager.start()
    const diag = manager.getDiagnostics()
    expect(diag.runtimeState).toBe("running")
    expect(diag.serviceCount).toBeGreaterThan(0)
    expect(diag.startedAt).toBeDefined()
  })

  it("reports canAcceptCommands", async () => {
    expect(manager.canAcceptCommands).toBe(false)
    await manager.start()
    expect(manager.canAcceptCommands).toBe(true)
  })

  it("executes health command", async () => {
    await manager.start()
    const cmd = createCommand(RUNTIME_COMMANDS.HEALTH_GET, {})
    const result = await manager.executeCommand(cmd)
    expect(result.ok).toBe(true)
  })

  it("executes diagnostics command", async () => {
    await manager.start()
    const cmd = createCommand(RUNTIME_COMMANDS.DIAGNOSTICS, {})
    const result = await manager.executeCommand(cmd)
    expect(result.ok).toBe(true)
  })

  it("rejects commands when not ready", async () => {
    const cmd = createCommand(RUNTIME_COMMANDS.HEALTH_GET, {})
    const result = await manager.executeCommand(cmd)
    expect(result.ok).toBe(false)
  })

  it("rejects unknown command types", async () => {
    await manager.start()
    const cmd = createCommand("unknown.command", {})
    const result = await manager.executeCommand(cmd)
    expect(result.ok).toBe(false)
  })

  it("registers service hooks", async () => {
    const hook = {
      id: "EventBus",
      start: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      stop: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    }
    manager.registerServiceHook(hook)
    await manager.start()
    expect(hook.start).toHaveBeenCalled()
  })

  it("can recover", async () => {
    await manager.start()
    const result = await manager.recover()
    expect(result.ok).toBe(true)
  })

  it("exposes config", () => {
    expect(manager.config).toBeDefined()
    expect(manager.config.maxConcurrentWorkers).toBe(8)
  })
})
