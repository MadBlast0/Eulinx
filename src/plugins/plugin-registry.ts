import { createLogger } from "@/core/logger"
import { PluginLifecycleManager } from "./plugin-lifecycle"
import { PluginHost } from "./plugin-sdk"
import type { PluginManifest, PluginInstance, PluginState } from "./plugin-types"
import type { ToolRegistry } from "@/tools/tool-registry"

const log = createLogger("plugin-registry")

export class PluginRegistry {
  private lifecycle: PluginLifecycleManager
  private hosts: Map<string, PluginHost> = new Map()
  private pluginMap: Map<string, PluginInstance> = new Map()
  private toolRegistry: ToolRegistry | undefined

  constructor(lifecycle?: PluginLifecycleManager, toolRegistry?: ToolRegistry) {
    this.lifecycle = lifecycle ?? new PluginLifecycleManager()
    this.toolRegistry = toolRegistry
  }

  /** Bind the shared tool registry so plugin tools flow through. */
  bindToolRegistry(registry: ToolRegistry): void {
    this.toolRegistry = registry
    for (const host of this.hosts.values()) {
      host.bindRegistry(registry)
    }
  }

  /** Whether a tool registry is currently bound. */
  hasToolRegistry(): boolean {
    return this.toolRegistry !== undefined
  }

  getLifecycle(): PluginLifecycleManager {
    return this.lifecycle
  }

  getHost(pluginId: string): PluginHost {
    let host = this.hosts.get(pluginId)
    if (!host) {
      host = new PluginHost(pluginId)
      if (this.toolRegistry) host.bindRegistry(this.toolRegistry)
      this.hosts.set(pluginId, host)
    }
    return host
  }

  async register(manifest: PluginManifest): Promise<PluginInstance> {
    // Adopt the lifecycle manager's live instance (whose state is driven by
    // install/activate) so the registry reflects the real plugin state instead
    // of an orphaned 'discovered' copy.
    const existing = this.lifecycle.getInstance(manifest.id)
    const instance: PluginInstance = existing ?? {
      manifest,
      state: 'discovered' as PluginState,
      grantRecord: manifest.capabilities.map((c) => ({
        capability: c.capability,
        scope: c.scope,
        granted: false,
      })),
      failureCount: 0,
      lastFailure: null,
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.pluginMap.set(manifest.id, instance)

    const host = this.getHost(manifest.id)
    for (const cap of manifest.capabilities) {
      const granted = instance.grantRecord.find((g) => g.capability === cap.capability)?.granted ?? false
      host.setPermission(cap.capability, granted)
    }

    await this.persistState()
    log.info(`Plugin registered: ${manifest.id} v${manifest.version}`)
    return instance
  }

  get(pluginId: string): PluginInstance | undefined {
    return this.pluginMap.get(pluginId)
  }

  list(): PluginInstance[] {
    return Array.from(this.pluginMap.values())
  }

  listActive(): PluginInstance[] {
    return this.list().filter((p) => p.state === 'activated' as PluginState)
  }

  async unregister(pluginId: string): Promise<void> {
    this.pluginMap.delete(pluginId)
    this.hosts.delete(pluginId)
    await this.lifecycle.uninstall(pluginId)
    await this.persistState()
    log.info(`Plugin unregistered: ${pluginId}`)
  }

  private async persistState(): Promise<void> {
    try {
      const data = Array.from(this.pluginMap.entries()).map(([id, instance]) => ({
        id,
        manifest: instance.manifest,
        state: instance.state,
        grantRecord: instance.grantRecord,
        failureCount: instance.failureCount,
        installedAt: instance.installedAt,
      }))

      if (typeof window !== 'undefined' && (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ === undefined) {
        localStorage.setItem('eulinx:plugin_registry', JSON.stringify(data))
      }
    } catch (e) {
      log.error('Failed to persist plugin registry state', { error: e })
    }
  }

  async loadPersistedState(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ === undefined) {
        const raw = localStorage.getItem('eulinx:plugin_registry')
        if (!raw) return
        const data = JSON.parse(raw) as Array<{
          id: string
          manifest: PluginManifest
          state: PluginState
          grantRecord: { capability: string; scope: string; granted: boolean }[]
          failureCount: number
          installedAt: string
        }>

        for (const entry of data) {
          const instance: PluginInstance = {
            manifest: entry.manifest,
            state: entry.state,
            grantRecord: entry.grantRecord as PluginInstance['grantRecord'],
            failureCount: entry.failureCount,
            lastFailure: null,
            installedAt: entry.installedAt,
            updatedAt: new Date().toISOString(),
          }
          this.pluginMap.set(entry.id, instance)
          this.lifecycle['states'].set(entry.id, entry.state)

          const host = this.getHost(entry.id)
          for (const cap of entry.manifest.capabilities) {
            host.setPermission(cap.capability, entry.grantRecord.find((g) => g.capability === cap.capability)?.granted ?? false)
          }
        }

        log.info(`Loaded ${data.length} plugins from persisted state`)
      }
    } catch (e) {
      log.error('Failed to load persisted plugin state', { error: e })
    }
  }
}

let instance: PluginRegistry | null = null

export function getPluginRegistry(toolRegistry?: ToolRegistry): PluginRegistry {
  if (!instance) {
    instance = new PluginRegistry(undefined, toolRegistry)
  } else if (toolRegistry && !instance.hasToolRegistry()) {
    instance.bindToolRegistry(toolRegistry)
  }
  return instance
}
