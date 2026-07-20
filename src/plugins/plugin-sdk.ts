import { createLogger } from "@/core/logger"
import type {
  ToolDescriptor,
  HookRegistration,
  EventHandler,
  UnsubscribeFn,
  PluginCapability,
} from "./plugin-types"
import { brand } from "@/core/types"
import type { ToolRegistry } from "@/tools/tool-registry"
import type { PluginTool, ToolState } from "@/tools/tool-types"

const log = createLogger("plugin-sdk")

export class PluginHost {
  private tools: Map<string, ToolDescriptor> = new Map()
  private hooks: Map<string, HookRegistration[]> = new Map()
  private eventSubscriptions: Map<string, Set<EventHandler>> = new Map()
  private permissions: Map<PluginCapability, boolean> = new Map()
  private registry: ToolRegistry | undefined

  getPluginId(): string {
    return this.pluginId
  }

  constructor(private readonly pluginId: string) {
  }

  /** Bind the host to the shared tool registry so plugin tools flow through. */
  bindRegistry(registry: ToolRegistry): void {
    this.registry = registry
  }

  registerTool(descriptor: ToolDescriptor): void {
    const toolId = `${this.pluginId}/${descriptor.name}`
    this.tools.set(toolId, { ...descriptor, id: toolId, pluginId: this.pluginId })
    log.info(`Tool registered: ${toolId}`)

    // Forward into the shared registry so the model can discover it.
    if (this.registry) {
      const pluginTool = this.toPluginTool(descriptor, toolId, "enabled")
      this.registry.registerPluginTool(pluginTool)
    }
  }

  /** Build a registry-compatible PluginTool from a descriptor. */
  toPluginTool(descriptor: ToolDescriptor, toolId: string, state: ToolState): PluginTool {
    const id = brand<string, "PluginId">(this.pluginId)
    return {
      toolId,
      pluginId: id,
      pluginVersion: "0.0.0",
      localName: descriptor.name,
      definition: {
        name: toolId,
        description: descriptor.description,
        parameters: descriptor.schema as PluginTool["definition"]["parameters"],
        result: { type: "object" },
      },
      sideEffect: { kind: "read_only", idempotent: false, network: false },
      requiredPermissions: [],
      execution: { timeoutMs: 30000, maxConcurrent: 1, cancellable: true, onTimeout: "abort_and_error" },
      handlerRef: { module: "plugin", export: "handler" },
      state,
      registeredAt: new Date().toISOString(),
    }
  }

  unregisterTool(name: string): void {
    const toolId = `${this.pluginId}/${name}`
    this.tools.delete(toolId)
  }

  getTool(id: string): ToolDescriptor | undefined {
    return this.tools.get(id)
  }

  listTools(): ToolDescriptor[] {
    return Array.from(this.tools.values())
  }

  registerHook(registration: HookRegistration): void {
    const existing = this.hooks.get(registration.hookName) ?? []
    existing.push(registration)
    this.hooks.set(registration.hookName, existing)
    log.info(`Hook registered: ${registration.hookName} (${registration.hookType}) for ${this.pluginId}`)
  }

  unregisterHook(hookName: string): void {
    this.hooks.delete(hookName)
  }

  getHooks(hookName: string): HookRegistration[] {
    return this.hooks.get(hookName) ?? []
  }

  listAllHooks(): Map<string, HookRegistration[]> {
    return new Map(this.hooks)
  }

  subscribe(eventType: string, handler: EventHandler): UnsubscribeFn {
    const subs = this.eventSubscriptions.get(eventType) ?? new Set()
    subs.add(handler)
    this.eventSubscriptions.set(eventType, subs)

    return () => {
      subs.delete(handler)
      if (subs.size === 0) {
        this.eventSubscriptions.delete(eventType)
      }
    }
  }

  emit(eventType: string, payload: unknown): void {
    const subs = this.eventSubscriptions.get(eventType)
    if (!subs) return
    for (const handler of subs) {
      try {
        handler(payload)
      } catch (e) {
        log.error(`Event handler error for ${eventType}`, { error: e })
      }
    }
  }

  setPermission(capability: PluginCapability, granted: boolean): void {
    this.permissions.set(capability, granted)
  }

  hasPermission(capability: PluginCapability): boolean {
    return this.permissions.get(capability) ?? false
  }

  async requestPermission(capability: PluginCapability): Promise<boolean> {
    return this.permissions.get(capability) ?? false
  }

  clear(): void {
    this.tools.clear()
    this.hooks.clear()
    this.eventSubscriptions.clear()
  }
}
