/**
 * P13-TOOL-MANAGER — Tool Manager Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ToolManager } from "./tool-manager"
import type { CoreTool, PluginTool } from "./tool-types"
import type { PluginId } from "@/core/types"

// ---------------------------------------------------------------------------
// Mock Tools
// ---------------------------------------------------------------------------

function createMockCoreTool(id = "test.tool"): CoreTool {
  return {
    id,
    name: "Test Tool",
    description: "A test tool for testing",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    sideEffect: { kind: "read_only", idempotent: true, network: false },
    category: "filesystem",
  }
}

function createMockPluginTool(toolId = "myplugin.test"): PluginTool {
  return {
    toolId,
    pluginId: "myplugin" as PluginId,
    pluginVersion: "1.0.0",
    localName: "test",
    definition: {
      name: toolId,
      description: "A plugin test tool",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      result: { type: "object" },
    },
    sideEffect: { kind: "read_only", idempotent: true, network: false },
    requiredPermissions: [],
    execution: { timeoutMs: 30000, maxConcurrent: 1, cancellable: true, onTimeout: "abort_and_error" },
    handlerRef: { module: "handler.js", export: "handle" },
    state: "enabled",
    registeredAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ToolManager", () => {
  let manager: ToolManager

  beforeEach(() => {
    manager = new ToolManager()
  })

  it("registers core tools", () => {
    manager.registerCoreTool(createMockCoreTool())

    expect(manager.has("test.tool")).toBe(true)
    expect(manager.listCoreTools()).toHaveLength(1)
  })

  it("registers plugin tools", () => {
    const result = manager.registerPluginTool(createMockPluginTool())

    expect(result).toBe(true)
    expect(manager.has("myplugin.test")).toBe(true)
  })

  it("enables and disables tools", () => {
    manager.registerPluginTool(createMockPluginTool())

    manager.disableTool("myplugin.test")
    expect(manager.isEnabled("myplugin.test")).toBe(false)

    manager.enableTool("myplugin.test")
    expect(manager.isEnabled("myplugin.test")).toBe(true)
  })

  it("quarantines tools", () => {
    manager.registerPluginTool(createMockPluginTool())

    manager.quarantineTool("myplugin.test", "Repeated failures")
    expect(manager.isEnabled("myplugin.test")).toBe(false)
  })

  it("invokes a tool successfully", async () => {
    const tool = createMockCoreTool()
    manager.registerCoreTool(tool, async () => "success")

    const result = await manager.invoke(
      { toolId: "test.tool", args: {}, workerId: "worker-1" },
    )

    expect(result.ok).toBe(true)
    expect(result.data).toBe("success")
  })

  it("returns error for disabled tool", async () => {
    const tool = createMockPluginTool()
    manager.registerPluginTool(tool)
    manager.disableTool("myplugin.test")

    const result = await manager.invoke(
      { toolId: "myplugin.test", args: {}, workerId: "worker-1" },
    )

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe("tool_not_available")
  })

  it("returns error for failed handler", async () => {
    const tool = createMockCoreTool()
    manager.registerCoreTool(tool)
    manager.registerHandler("test.tool", async () => { throw new Error("Handler failed") })

    const result = await manager.invoke(
      { toolId: "test.tool", args: {}, workerId: "worker-1" },
    )

    expect(result.ok).toBe(false)
    expect(result.error?.message).toBe("Handler failed")
  })

  it("returns error when no handler is registered", async () => {
    manager.registerCoreTool(createMockCoreTool())

    const result = await manager.invoke(
      { toolId: "test.tool", args: {}, workerId: "worker-1" },
    )

    expect(result.ok).toBe(false)
    expect(result.error?.message).toContain("No handler registered")
  })

  it("emits events", async () => {
    const events: string[] = []
    manager.on("tool.invoked", (e) => events.push(e.type))

    const tool = createMockCoreTool()
    manager.registerCoreTool(tool, async () => "ok")
    await manager.invoke(
      { toolId: "test.tool", args: {}, workerId: "worker-1" },
    )

    expect(events).toContain("tool.invoked")
  })

  it("cancels running invocation", () => {
    const tool = createMockCoreTool()
    manager.registerCoreTool(tool, () => new Promise(() => {})) // Never resolves

    // Start an invocation (won't complete)
    manager.invoke(
      { toolId: "test.tool", args: {}, workerId: "worker-1" },
    )

    const cancelled = manager.cancel("test.tool")
    expect(cancelled).toBe(true)
  })

  it("shuts down cleanly", async () => {
    manager.registerCoreTool(createMockCoreTool())

    await manager.shutdown()

    // After shutdown, invocations should be cancelled
  })
})
