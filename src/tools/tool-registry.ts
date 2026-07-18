/**
 * P13-TOOL-REGISTRY — Tool Registry
 *
 * Central catalog of all tools (core + plugin).
 * From ToolPlugins-Part04: namespacing and collision rules.
 */

import type {
  CoreTool,
  PluginTool,
  ToolDefinition,
  ToolState,
  ToolCategory,
} from "./tool-types"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

// ---------------------------------------------------------------------------
// Tool Registry
// ---------------------------------------------------------------------------

export class ToolRegistry {
  private readonly logger: Logger
  private readonly coreTools = new Map<string, CoreTool>()
  private readonly pluginTools = new Map<string, PluginTool>()
  private generationCounter = 0

  constructor() {
    this.logger = createLogger("ToolRegistry")
  }

  // -----------------------------------------------------------------------
  // Core Tools
  // -----------------------------------------------------------------------

  /** Register a core tool */
  registerCoreTool(tool: CoreTool): void {
    this.coreTools.set(tool.id, tool)
    this.generationCounter++
    this.logger.info(`Core tool registered: ${tool.id}`)
  }

  /** Get a core tool */
  getCoreTool(id: string): CoreTool | undefined {
    return this.coreTools.get(id)
  }

  /** List all core tools */
  listCoreTools(): readonly CoreTool[] {
    return Array.from(this.coreTools.values())
  }

  // -----------------------------------------------------------------------
  // Plugin Tools
  // -----------------------------------------------------------------------

  /** Register a plugin tool */
  registerPluginTool(tool: PluginTool): boolean {
    // Core tools always win - no collision allowed
    if (this.coreTools.has(tool.toolId)) {
      this.logger.warn(`Plugin tool collides with core: ${tool.toolId}`)
      return false
    }

    // Check for collision with existing plugin tools
    if (this.pluginTools.has(tool.toolId)) {
      this.logger.warn(`Plugin tool collision: ${tool.toolId}`)
      return false
    }

    this.pluginTools.set(tool.toolId, tool)
    this.generationCounter++
    this.logger.info(`Plugin tool registered: ${tool.toolId}`)
    return true
  }

  /** Update plugin tool state */
  setPluginToolState(toolId: string, state: ToolState, reason?: string): boolean {
    const tool = this.pluginTools.get(toolId)
    if (!tool) return false

    // Create updated tool with new state
    const updated: PluginTool = {
      ...tool,
      state,
      quarantineReason: reason,
    }

    this.pluginTools.set(toolId, updated)
    this.generationCounter++
    return true
  }

  /** Get a plugin tool */
  getPluginTool(toolId: string): PluginTool | undefined {
    return this.pluginTools.get(toolId)
  }

  /** List all plugin tools */
  listPluginTools(): readonly PluginTool[] {
    return Array.from(this.pluginTools.values())
  }

  /** Remove all tools for a plugin */
  unregisterPlugin(pluginId: string): void {
    for (const [toolId, tool] of this.pluginTools) {
      // Match by pluginId field OR by toolId prefix (toolId starts with pluginId + "." or "/")
      if (tool.pluginId === pluginId || toolId.startsWith(pluginId + ".") || toolId.startsWith(pluginId + "/")) {
        this.pluginTools.delete(toolId)
        this.generationCounter++
      }
    }
    this.logger.info(`All tools unregistered for plugin: ${pluginId}`)
  }

  // -----------------------------------------------------------------------
  // Unified Queries
  // -----------------------------------------------------------------------

  /** Get a tool by ID (core or plugin) */
  getTool(id: string): CoreTool | PluginTool | undefined {
    return this.coreTools.get(id) ?? this.pluginTools.get(id)
  }

  /** Get a tool definition for model consumption */
  getToolDefinition(id: string): ToolDefinition | undefined {
    const core = this.coreTools.get(id)
    if (core) {
      return {
        name: core.id,
        description: core.description,
        parameters: core.parameters,
        result: { type: "object" },
      }
    }

    const plugin = this.pluginTools.get(id)
    if (plugin && plugin.state === "enabled") {
      return plugin.definition
    }

    return undefined
  }

  /** List all enabled tool definitions for a model */
  listEnabledDefinitions(): readonly ToolDefinition[] {
    const definitions: ToolDefinition[] = []

    // Core tools are always enabled
    for (const tool of this.coreTools.values()) {
      definitions.push({
        name: tool.id,
        description: tool.description,
        parameters: tool.parameters,
        result: { type: "object" },
      })
    }

    // Plugin tools must be in enabled state
    for (const tool of this.pluginTools.values()) {
      if (tool.state === "enabled") {
        definitions.push(tool.definition)
      }
    }

    return definitions
  }

  /** List tools by category */
  listByCategory(category: ToolCategory): readonly CoreTool[] {
    return Array.from(this.coreTools.values()).filter((t) => t.category === category)
  }

  /** Check if a tool exists */
  has(id: string): boolean {
    return this.coreTools.has(id) || this.pluginTools.has(id)
  }

  /** Check if a tool is enabled */
  isEnabled(id: string): boolean {
    const core = this.coreTools.get(id)
    if (core) return true

    const plugin = this.pluginTools.get(id)
    return plugin?.state === "enabled"
  }

  /** Get current generation counter */
  get generation(): number {
    return this.generationCounter
  }

  /** Get total tool count */
  get size(): number {
    return this.coreTools.size + this.pluginTools.size
  }
}
