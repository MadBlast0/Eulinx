/**
 * P13-TOOL-REGISTRY — Tool Registry Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ToolRegistry } from "./tool-registry"
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

describe("ToolRegistry", () => {
  let registry: ToolRegistry

  beforeEach(() => {
    registry = new ToolRegistry()
  })

  it("registers and retrieves core tools", () => {
    const tool = createMockCoreTool()
    registry.registerCoreTool(tool)

    expect(registry.getCoreTool("test.tool")).toBeDefined()
    expect(registry.getCoreTool("test.tool")?.name).toBe("Test Tool")
  })

  it("lists core tools", () => {
    registry.registerCoreTool(createMockCoreTool("tool1"))
    registry.registerCoreTool(createMockCoreTool("tool2"))

    expect(registry.listCoreTools()).toHaveLength(2)
  })

  it("registers plugin tools", () => {
    const tool = createMockPluginTool()
    const result = registry.registerPluginTool(tool)

    expect(result).toBe(true)
    expect(registry.getPluginTool("myplugin.test")).toBeDefined()
  })

  it("rejects plugin tool colliding with core", () => {
    registry.registerCoreTool(createMockCoreTool("test.tool"))
    const tool = createMockPluginTool("test.tool")
    const result = registry.registerPluginTool(tool)

    expect(result).toBe(false)
  })

  it("rejects duplicate plugin tools", () => {
    registry.registerPluginTool(createMockPluginTool())
    const result = registry.registerPluginTool(createMockPluginTool())

    expect(result).toBe(false)
  })

  it("updates plugin tool state", () => {
    registry.registerPluginTool(createMockPluginTool())

    const result = registry.setPluginToolState("myplugin.test", "disabled")
    expect(result).toBe(true)

    const tool = registry.getPluginTool("myplugin.test")
    expect(tool?.state).toBe("disabled")
  })

  it("returns false for unknown tool state update", () => {
    const result = registry.setPluginToolState("unknown.tool", "disabled")
    expect(result).toBe(false)
  })

  it("gets tool definition for enabled plugin tool", () => {
    registry.registerPluginTool(createMockPluginTool())

    const def = registry.getToolDefinition("myplugin.test")
    expect(def).toBeDefined()
    expect(def?.name).toBe("myplugin.test")
  })

  it("returns undefined for disabled plugin tool definition", () => {
    const tool = createMockPluginTool()
    tool.state = "disabled"
    registry.registerPluginTool(tool)

    const def = registry.getToolDefinition("myplugin.test")
    expect(def).toBeUndefined()
  })

  it("lists enabled definitions", () => {
    registry.registerCoreTool(createMockCoreTool())
    registry.registerPluginTool(createMockPluginTool())

    const defs = registry.listEnabledDefinitions()
    expect(defs).toHaveLength(2)
  })

  it("unregisters all tools for a plugin", () => {
    registry.registerPluginTool(createMockPluginTool("plugin1.tool1"))
    registry.registerPluginTool(createMockPluginTool("plugin1.tool2"))
    registry.registerPluginTool(createMockPluginTool("plugin2.tool1"))

    registry.unregisterPlugin("plugin1")

    expect(registry.getPluginTool("plugin1.tool1")).toBeUndefined()
    expect(registry.getPluginTool("plugin1.tool2")).toBeUndefined()
    expect(registry.getPluginTool("plugin2.tool1")).toBeDefined()
  })

  it("checks if tool exists", () => {
    registry.registerCoreTool(createMockCoreTool())

    expect(registry.has("test.tool")).toBe(true)
    expect(registry.has("unknown.tool")).toBe(false)
  })

  it("checks if tool is enabled", () => {
    registry.registerCoreTool(createMockCoreTool())
    registry.registerPluginTool(createMockPluginTool())

    expect(registry.isEnabled("test.tool")).toBe(true)
    expect(registry.isEnabled("myplugin.test")).toBe(true)
  })

  it("increments generation counter", () => {
    const initial = registry.generation
    registry.registerCoreTool(createMockCoreTool())

    expect(registry.generation).toBeGreaterThan(initial)
  })
})
