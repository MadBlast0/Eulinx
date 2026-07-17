import { describe, it, expect } from "vitest"
import {
  RUNTIME_COMMANDS,
  createCommand,
  commandResultOk,
  commandResultErr,
} from "./runtime-commands"
import { CoreError } from "@/core/error"

describe("RUNTIME_COMMANDS", () => {
  it("defines all command types", () => {
    expect(RUNTIME_COMMANDS.START).toBe("runtime.start")
    expect(RUNTIME_COMMANDS.STOP).toBe("runtime.stop")
    expect(RUNTIME_COMMANDS.PAUSE).toBe("runtime.pause")
    expect(RUNTIME_COMMANDS.RESUME).toBe("runtime.resume")
    expect(RUNTIME_COMMANDS.HEALTH_GET).toBe("runtime.health.get")
    expect(RUNTIME_COMMANDS.WORKER_SPAWN).toBe("worker.spawn")
    expect(RUNTIME_COMMANDS.TOOL_INVOKE).toBe("tool.invoke")
    expect(RUNTIME_COMMANDS.DIAGNOSTICS).toBe("runtime.diagnostics")
  })
})

describe("createCommand", () => {
  it("creates a command with defaults", () => {
    const cmd = createCommand("test.type", { foo: "bar" })
    expect(cmd.type).toBe("test.type")
    expect(cmd.payload).toEqual({ foo: "bar" })
    expect(cmd.requestedBy).toBe("user")
    expect(cmd.id).toBeDefined()
    expect(cmd.requestedAt).toBeDefined()
  })

  it("creates a command with custom requester", () => {
    const cmd = createCommand("test.type", {}, "worker")
    expect(cmd.requestedBy).toBe("worker")
  })

  it("creates a command with workspace/session ids", () => {
    const cmd = createCommand("test.type", {}, "ui", {
      workspaceId: "ws-1" as never,
      sessionId: "sess-1" as never,
    })
    expect(cmd.workspaceId).toBe("ws-1")
    expect(cmd.sessionId).toBe("sess-1")
  })
})

describe("commandResultOk", () => {
  it("creates success result", () => {
    const result = commandResultOk("cmd-1", { data: 42 })
    expect(result.ok).toBe(true)
    expect(result.commandId).toBe("cmd-1")
    expect(result.data).toEqual({ data: 42 })
  })

  it("creates success result with events", () => {
    const result = commandResultOk("cmd-1", undefined, ["event1", "event2"])
    expect(result.events).toEqual(["event1", "event2"])
  })
})

describe("commandResultErr", () => {
  it("creates error result", () => {
    const error = new CoreError("validation_error", "bad input")
    const result = commandResultErr("cmd-1", error)
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe("validation_error")
    expect(result.error?.message).toBe("bad input")
  })
})
