/**
 * P13-TOOL-MANAGER — Tool Manager
 *
 * Top-level coordinator for tool invocation and management.
 * From ToolPlugins-Part05: invocation path, validation gates, permissions.
 */

import type {
  CoreTool,
  PluginTool,
  ToolInvocationRequest,
  ToolInvocationResult,
  ToolError,
  ToolCategory,
  ToolEvent,
  ToolEventType,
} from "./tool-types"
import { ToolRegistry } from "./tool-registry"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { JsonValue } from "@/core/types"
import { invoke, isTauri } from "@tauri-apps/api/core"

// ---------------------------------------------------------------------------
// Tool Manager
// ---------------------------------------------------------------------------

export class ToolManager {
  private readonly logger: Logger
  private readonly registry: ToolRegistry
  private readonly eventListeners: Map<ToolEventType, Set<(event: ToolEvent) => void>>
  private readonly invocations = new Map<string, AbortController>()
  private readonly handlers = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>()

  constructor() {
    this.logger = createLogger("ToolManager")
    this.registry = new ToolRegistry()
    this.eventListeners = new Map()
  }

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  /** Register a core tool */
  registerCoreTool(tool: CoreTool, handler?: (args: Record<string, unknown>) => Promise<unknown>): void {
    this.registry.registerCoreTool(tool)
    if (handler) {
      this.handlers.set(tool.id, handler)
    }
  }

  /** Register an in-process handler for a tool */
  registerHandler(toolId: string, handler: (args: Record<string, unknown>) => Promise<unknown>): void {
    this.handlers.set(toolId, handler)
  }

  /** Register a plugin tool */
  registerPluginTool(tool: PluginTool): boolean {
    const result = this.registry.registerPluginTool(tool)
    if (result) {
      this.emitEvent("tool.registered", tool.toolId)
    }
    return result
  }

  /** Enable a plugin tool */
  enableTool(toolId: string): boolean {
    const success = this.registry.setPluginToolState(toolId, "enabled")
    if (success) {
      this.emitEvent("tool.enabled", toolId)
    }
    return success
  }

  /** Disable a plugin tool */
  disableTool(toolId: string): boolean {
    const success = this.registry.setPluginToolState(toolId, "disabled")
    if (success) {
      this.emitEvent("tool.disabled", toolId)
    }
    return success
  }

  /** Quarantine a plugin tool */
  quarantineTool(toolId: string, reason: string): boolean {
    const success = this.registry.setPluginToolState(toolId, "quarantined", reason)
    if (success) {
      this.emitEvent("tool.quarantined", toolId, { reason })
    }
    return success
  }

  /** Unregister all tools for a plugin */
  unregisterPlugin(pluginId: string): void {
    this.registry.unregisterPlugin(pluginId)
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  /** Get a tool by ID */
  getTool(id: string): CoreTool | PluginTool | undefined {
    return this.registry.getTool(id)
  }

  /** Get tool definition for model */
  getToolDefinition(id: string) {
    return this.registry.getToolDefinition(id)
  }

  /** List all enabled tool definitions */
  listEnabledDefinitions() {
    return this.registry.listEnabledDefinitions()
  }

  /** List core tools */
  listCoreTools(): readonly CoreTool[] {
    return this.registry.listCoreTools()
  }

  /** List plugin tools */
  listPluginTools(): readonly PluginTool[] {
    return this.registry.listPluginTools()
  }

  /** List tools by category */
  listByCategory(category: ToolCategory) {
    return this.registry.listByCategory(category)
  }

  /** Check if tool exists */
  has(id: string): boolean {
    return this.registry.has(id)
  }

  /** Check if tool is enabled */
  isEnabled(id: string): boolean {
    return this.registry.isEnabled(id)
  }

  // -----------------------------------------------------------------------
  // Invocation
  // -----------------------------------------------------------------------

  /**
   * Invoke a tool.
   *
   * In Tauri mode, execution is delegated to the Rust backend via
   * `invoke("tool_invoke", { toolId, args })`. In browser mode, the
   * in-process handler registered via `registerHandler` or
   * `registerCoreTool` is called directly. Returns a structured
   * `ToolInvocationResult` with `ok: true` and `data` on success, or
   * `ok: false` and `error` on failure.
   */
  async invoke(request: ToolInvocationRequest): Promise<ToolInvocationResult> {
    const startTime = Date.now()
    const toolId = request.toolId

    // Check tool exists and is enabled
    if (!this.registry.isEnabled(toolId)) {
      return {
        ok: false,
        error: { code: "tool_not_available", message: `Tool not available: ${toolId}`, retryable: false },
        durationMs: Date.now() - startTime,
        toolId,
      }
    }

    // Create abort controller for timeout
    const controller = new AbortController()
    this.invocations.set(toolId, controller)

    const timeoutMs = request.timeoutMs ?? 30000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      this.emitEvent("tool.invoked", toolId, { workerId: request.workerId })

      let data: unknown

      if (isTauri()) {
        data = await invoke<JsonValue>("tool_invoke", { toolId, args: request.args })
      } else {
        const handler = this.handlers.get(toolId)
        if (!handler) {
          throw new Error(`No handler registered for tool "${toolId}"`)
        }
        data = await handler(request.args as Record<string, unknown>)
      }

      clearTimeout(timeoutId)
      this.invocations.delete(toolId)

      this.emitEvent("tool.completed", toolId, { durationMs: Date.now() - startTime })

      return {
        ok: true,
        data: data as JsonValue,
        durationMs: Date.now() - startTime,
        toolId,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      this.invocations.delete(toolId)

      const toolError: ToolError = {
        code: "tool_execution_failed",
        message: error instanceof Error ? error.message : String(error),
        retryable: false,
      }

      this.emitEvent("tool.failed", toolId, { error: toolError.message })

      return {
        ok: false,
        error: toolError,
        durationMs: Date.now() - startTime,
        toolId,
      }
    }
  }

  /** Cancel a running invocation */
  cancel(toolId: string): boolean {
    const controller = this.invocations.get(toolId)
    if (controller) {
      controller.abort()
      this.invocations.delete(toolId)
      return true
    }
    return false
  }

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  on(eventType: ToolEventType, listener: (event: ToolEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    const listeners = this.eventListeners.get(eventType)
    if (listeners) listeners.add(listener)
  }

  off(eventType: ToolEventType, listener: (event: ToolEvent) => void): void {
    this.eventListeners.get(eventType)?.delete(listener)
  }

  private emitEvent(type: ToolEventType, toolId: string, data?: Record<string, unknown>): void {
    const event: ToolEvent = {
      type,
      toolId,
      timestamp: new Date().toISOString(),
      data: data as import("@/core/types").JsonObject,
    }

    this.eventListeners.get(type)?.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        this.logger.error(`Event listener error: ${error}`)
      }
    })
  }

  // -----------------------------------------------------------------------
  // Shutdown
  // -----------------------------------------------------------------------

  async shutdown(): Promise<void> {
    // Cancel all running invocations
    for (const [toolId, controller] of this.invocations) {
      controller.abort()
      this.logger.warn(`Cancelled invocation: ${toolId}`)
    }
    this.invocations.clear()
    this.eventListeners.clear()
    this.logger.info("ToolManager shut down")
  }
}
