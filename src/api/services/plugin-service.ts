/**
 * P15-API-PLUGIN — pluginService
 *
 * List, install, enable, disable, and invoke a plugin capability. Until the
 * `db_*` plugin commands exist, an in-memory registry backs the gateway so the
 * call surface matches the documented contract.
 */

import type { PluginId, PluginCapability } from "@/core/types"

export interface Plugin {
  readonly id: PluginId
  readonly name: string
  readonly enabled: boolean
  readonly capabilities: readonly PluginCapability[]
}

const plugins = new Map<string, Plugin>()

export const pluginService = {
  list(): readonly Plugin[] {
    return Array.from(plugins.values())
  },

  install(id: PluginId, name: string, capabilities: readonly PluginCapability[] = []): Plugin {
    const plugin: Plugin = { id, name, enabled: true, capabilities }
    plugins.set(id, plugin)
    return plugin
  },

  enable(id: PluginId, enabled: boolean): Plugin | undefined {
    const plugin = plugins.get(id)
    if (!plugin) return undefined
    const updated: Plugin = { ...plugin, enabled }
    plugins.set(id, updated)
    return updated
  },

  invokeCapability(id: PluginId, capability: PluginCapability, args: Record<string, unknown> = {}): unknown {
    const plugin = plugins.get(id)
    if (!plugin) return undefined
    if (!plugin.capabilities.includes(capability)) return undefined
    return { pluginId: id, capability, args }
  },
} as const

export type PluginService = typeof pluginService
